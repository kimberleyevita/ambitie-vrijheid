import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';
import { C } from '../tokens.js';
import { INFLATIE, AOW_MAAND, FIRE_PCT } from '../tokens.js';
import { eur, berekenOnderhoud, berekenAow, berekenHypoDeel, bouwPrognose, berekenJaarruimte } from '../utils.js';
import { CATS, ALLE_ITEMS } from '../data/lifestyle.js';
import { Card, Kop, Lbl, Inp, Slider, Metric, InfoBox, BarVoortgang, StapBtn, TipTool } from './Atoms.jsx';

const STAPPEN = [
  { id: "profiel",   label: "Jouw situatie"       },
  { id: "lifestyle", label: "Gewenste levensstijl" },
  { id: "vermogen",  label: "Huidig vermogen"      },
  { id: "pensioen",  label: "Pensioen & AOW"       },
  { id: "prognose",  label: "Jouw vrijheidsplan"   },
];

export default function VrijheidsWizard() {
  const [stap, setStap]         = useState(0);
  const [openGroep, setOpenGroep] = useState("Wonen");

  const [profiel, setProfiel] = useState({
    naam: "", geboortejaar: 1985, stopLeeftijd: 55, inkomen: 72000, partner: false,
  });

  const defLS = Object.fromEntries(ALLE_ITEMS.map(i => [i.key, i.def]));
  const [ls, setLs] = useState({ ...defLS, woningWaarde: 400000, bouwjaar: 1990, huurder: false });

  const [verm, setVerm] = useState({
    beleggingen: 45000, sparen: 18500, lijfrente: 28000, overig: 0,
    inleg: 1200, rendement: 6.5,
  });

  const [pens, setPens] = useState({ werkgever: 800, eigen: 300, jaarruimte: 3000 });

  const [leningen, setLeningen] = useState([
    { id: 1, label: "Leningdeel A", hoofdsom: 280000, rente: 4.2, looptijdJaar: 30, startjaar: 2020, soort: "annuiteit" },
  ]);

  // ── derived ──────────────────────────────────────────────────────────────────
  const leeftijd     = 2025 - profiel.geboortejaar;
  const aow          = berekenAow(profiel.geboortejaar);
  const jarenTotStop = profiel.stopLeeftijd - leeftijd;
  const stopJaar     = 2025 + jarenTotStop;
  const aowGat       = profiel.stopLeeftijd < aow.leeftijd;
  const jarenGat     = aowGat ? aow.leeftijd - profiel.stopLeeftijd : 0;

  const autoOnderhoud    = ls.huurder ? 0 : berekenOnderhoud(ls.woningWaarde, ls.bouwjaar);
  const jaarruimteCalc   = berekenJaarruimte(profiel.inkomen);

  const leningCalc    = leningen.map(d => ({ ...d, ...berekenHypoDeel(d) }));
  const hypoMaandNu   = leningCalc.reduce((s, d) => s + d.maand, 0);
  const hypoRestschuld= leningCalc.reduce((s, d) => s + d.restschuld, 0);
  const hypoOpStop    = leningCalc.reduce((s, d) => d.eindjaar > stopJaar ? s + d.maand : s, 0);
  const hypotheekVrij = !ls.huurder && leningen.length > 0 && hypoOpStop === 0;

  const effLs = {
    ...ls,
    onderhoud: ls.huurder ? 0 : autoOnderhoud,
    huurHypo: !ls.huurder && hypoMaandNu > 0 ? hypoMaandNu : ls.huurHypo,
  };

  const maandNu = ALLE_ITEMS.reduce((s, item) => {
    const v = effLs[item.key] || 0;
    return s + (item.div ? v / item.div : v);
  }, 0);

  const maandOpStop   = !ls.huurder && hypoMaandNu > 0 ? maandNu - hypoMaandNu + hypoOpStop : maandNu;
  const jaarOpStop    = maandOpStop * 12 * Math.pow(1 + INFLATIE, jarenTotStop);
  const cashNodig     = maandNu * 6;
  const heeftBuffer   = verm.sparen >= cashNodig;

  const aowBij   = aowGat ? 0 : AOW_MAAND;
  const pensBij  = aowGat ? 0 : pens.werkgever + pens.eigen;
  const benodigdKap = Math.max(0, jaarOpStop - (aowBij + pensBij) * 12) / FIRE_PCT;

  const totaalVerm = verm.beleggingen + verm.sparen + verm.lijfrente + verm.overig;
  const progData   = bouwPrognose(leeftijd, profiel.stopLeeftijd, totaalVerm, verm.inleg, verm.rendement / 100, benodigdKap);
  const vermOpStop = progData.find(d => d.leeftijd === profiel.stopLeeftijd)?.vermogen || 0;
  const verschil   = vermOpStop - benodigdKap;
  const doelBereikt = verschil >= 0;

  const missend = ALLE_ITEMS.filter(item => {
    const v = effLs[item.key] || 0;
    const b = item.div ? item.bench / item.div : item.bench;
    return b > 50 && v === 0 && item.key !== "kinderen" && item.key !== "huisdier";
  });
  const telaag = ALLE_ITEMS.filter(item => {
    const v = effLs[item.key] || 0;
    const b = item.div ? item.bench / item.div : item.bench;
    const m = item.div ? v / item.div : v;
    return b > 50 && m > 0 && m < b * 0.5;
  });

  // helpers
  const setL  = (k, v) => setLs(p  => ({ ...p, [k]: v }));
  const setP  = (k, v) => setProfiel(p => ({ ...p, [k]: v }));
  const setV  = (k, v) => setVerm(p => ({ ...p, [k]: v }));
  const setPn = (k, v) => setPens(p => ({ ...p, [k]: v }));

  function addLening() {
    setLeningen(p => [...p, {
      id: Date.now(),
      label: `Leningdeel ${String.fromCharCode(65 + p.length)}`,
      hoofdsom: 100000, rente: 4.0, looptijdJaar: 30, startjaar: 2020, soort: "annuiteit",
    }]);
  }
  const delLening = id => setLeningen(p => p.filter(d => d.id !== id));
  const updLening = (id, k, v) => setLeningen(p => p.map(d => d.id === id ? { ...d, [k]: v } : d));

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28 }}>

      {/* Sidebar */}
      <div>
        <Card style={{ position: "sticky", top: 80 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Jouw plan
          </div>
          {STAPPEN.map((s, i) => (
            <StapBtn key={s.id} nr={i + 1} active={stap === i} done={stap > i} label={s.label} onClick={() => setStap(i)} />
          ))}
          {stap === 4 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: doelBereikt ? C.greenPale : C.redPale, borderRadius: 10, border: `1px solid ${(doelBereikt ? C.greenLight : C.red)}40` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: doelBereikt ? C.green : C.red }}>
                {doelBereikt ? "✓ Doel bereikbaar" : "⚠ Bijstelling nodig"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                {doelBereikt ? `${eur(verschil)} overschot` : `${eur(Math.abs(verschil))} tekort`}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Main */}
      <div className="fu">

        {/* ── STAP 1: PROFIEL ── */}
        {stap === 0 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Laten we beginnen met de basis. Alle berekeningen blijven lokaal op jouw apparaat.">
              Jouw situatie
            </Kop>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>
              <div>
                <Lbl>Naam (optioneel)</Lbl>
                <Inp type="text" value={profiel.naam} onChange={v => setP("naam", v)} placeholder="Voor de persoonlijke touch" />
              </div>
              <div>
                <Lbl info="Je geboortejaar — we berekenen hieruit je leeftijd én AOW-leeftijd.">Geboortejaar</Lbl>
                <Inp value={profiel.geboortejaar} onChange={v => setP("geboortejaar", v)} suffix={`(${leeftijd} jaar)`} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Slider label="Wanneer wil je financieel vrij zijn?" value={profiel.stopLeeftijd}
                  onChange={v => setP("stopLeeftijd", v)} min={leeftijd + 1} max={75}
                  fmt={v => `${v} jaar (over ${v - leeftijd} jaar)`} />
              </div>
              <div>
                <Lbl info="Bruto jaarsalaris incl. vakantiegeld. ZZP: gemiddelde jaarwinst.">Bruto jaarinkomen</Lbl>
                <Inp value={profiel.inkomen} onChange={v => setP("inkomen", v)} prefix="€" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="partner2" checked={profiel.partner} onChange={e => setP("partner", e.target.checked)} />
                <label htmlFor="partner2" style={{ fontSize: 14, color: C.text, cursor: "pointer" }}>
                  Ik plan samen met een partner
                </label>
              </div>
            </div>

            {/* AOW indicator */}
            <div style={{ marginTop: 20, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "14px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                    AOW-leeftijd: <span style={{ fontFamily: "'DM Mono',monospace", color: aow.zeker ? C.greenLight : C.gold }}>{aow.leeftijd} jaar</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 6, lineHeight: 1.6 }}>⚠️ {aow.disclaimer}</div>}
                  {aowGat && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: C.red }}>AOW-gat: {jarenGat} jaar — je moet dit zelf overbruggen</div>}
                </div>
                <span style={{ fontSize: 10, background: aow.zeker ? `${C.greenLight}20` : `${C.gold}20`, color: aow.zeker ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase", flexShrink: 0, marginLeft: 10 }}>
                  {aow.zeker ? "Officieel ✓" : "Indicatie"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <InfoBox>Je wil stoppen op <strong>{profiel.stopLeeftijd} jaar</strong> — over <strong>{jarenTotStop} jaar</strong>. {aowGat ? `AOW begint pas op ${aow.leeftijd} — een gat van ${jarenGat} jaar om zelf te overbruggen.` : "Op je stopdatum ontvang je al AOW."}</InfoBox>
            </div>
            <button onClick={() => setStap(1)} style={{ marginTop: 20, background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Volgende → Levensstijl
            </button>
          </Card>
        )}

        {/* ── STAP 2: LIFESTYLE ── */}
        {stap === 1 && (
          <div>
            <Card accent={C.gold} style={{ marginBottom: 14 }}>
              <Kop size={26} sub="Hoe wil jij leven als je financieel vrij bent? Wees eerlijk — dit is jouw droomscenario.">
                Gewenste levensstijl
              </Kop>

              {/* Woninggegevens */}
              <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, marginBottom: 14, color: C.text }}>
                  🏠 Woninggegevens
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <Lbl>Woningwaarde</Lbl>
                    <Inp value={ls.woningWaarde} onChange={v => setL("woningWaarde", v)} prefix="€" />
                  </div>
                  <div>
                    <Lbl info="Bouwjaar bepaalt onderhoudsnorm: voor 1980 = 1,8%/jr, 1980–2000 = 1,4%, na 2000 = 1,1% van woningwaarde.">Bouwjaar</Lbl>
                    <Inp value={ls.bouwjaar} onChange={v => setL("bouwjaar", v)} />
                  </div>
                  <div style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Berekend onderhoud</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: C.gold, fontWeight: 600 }}>{eur(autoOnderhoud)}/mnd</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="huurder" checked={ls.huurder} onChange={e => setL("huurder", e.target.checked)} />
                    <label htmlFor="huurder" style={{ fontSize: 13, color: C.text, cursor: "pointer", whiteSpace: "nowrap" }}>Ik huur</label>
                  </div>
                </div>
              </div>

              {/* Hypotheekdelen */}
              {!ls.huurder && (
                <div style={{ marginTop: 14, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: C.text }}>🏦 Hypotheekdelen</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Totaal nu: <span style={{ fontFamily: "'DM Mono',monospace", color: C.gold, fontWeight: 600 }}>{eur(hypoMaandNu)}/mnd</span>
                        {" · "}Restschuld: <span style={{ fontFamily: "'DM Mono',monospace", color: C.red, fontWeight: 600 }}>{eur(hypoRestschuld)}</span>
                      </div>
                    </div>
                    <button onClick={addLening} style={{ background: C.gold, border: "none", borderRadius: 9, padding: "7px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>+ Leningdeel</button>
                  </div>

                  {leningen.map((deel, idx) => {
                    const c = leningCalc.find(b => b.id === deel.id) || {};
                    const aflVoorStop = c.eindjaar && c.eindjaar <= stopJaar;
                    return (
                      <div key={deel.id} style={{ padding: "16px 18px", borderBottom: idx < leningen.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input value={deel.label} onChange={e => updLening(deel.id, "label", e.target.value)}
                              style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "2px 4px", width: 140 }} />
                            <span style={{ fontSize: 10, background: aflVoorStop ? `${C.greenLight}20` : `${C.gold}18`, color: aflVoorStop ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600 }}>
                              {aflVoorStop ? `✓ Afgelost (${c.eindjaar})` : `Loopt t/m ${c.eindjaar || "?"}`}
                            </span>
                          </div>
                          {leningen.length > 1 && (
                            <button onClick={() => delLening(deel.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                          )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                          <div><Lbl>Hoofdsom</Lbl><Inp value={deel.hoofdsom} onChange={v => updLening(deel.id, "hoofdsom", v)} prefix="€" /></div>
                          <div><Lbl>Rente</Lbl><Inp value={deel.rente} onChange={v => updLening(deel.id, "rente", v)} suffix="%" /></div>
                          <div><Lbl>Looptijd</Lbl><Inp value={deel.looptijdJaar} onChange={v => updLening(deel.id, "looptijdJaar", v)} suffix="jaar" /></div>
                          <div><Lbl>Startjaar</Lbl><Inp value={deel.startjaar} onChange={v => updLening(deel.id, "startjaar", v)} /></div>
                          <div>
                            <Lbl info="Annuiteit: vaste maandlast. Lineair: vaste aflossing. Aflossingsvrij: alleen rente.">Soort</Lbl>
                            <select value={deel.soort} onChange={e => updLening(deel.id, "soort", e.target.value)}
                              style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text }}>
                              <option value="annuiteit">Annuiteit</option>
                              <option value="lineair">Lineair</option>
                              <option value="aflossingsvrij">Aflossingsvrij</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                          {[
                            { lbl: "Maandlast nu",           val: `${eur(c.maand || 0)}/mnd`,                                    clr: C.gold        },
                            { lbl: "Restschuld nu",          val: eur(c.restschuld || 0),                                        clr: C.red         },
                            { lbl: `Op ${profiel.stopLeeftijd}j`, val: aflVoorStop ? "€0 — afgelost ✓" : `${eur(c.maand || 0)}/mnd`, clr: aflVoorStop ? C.greenLight : C.text },
                          ].map((k, i) => (
                            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
                              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{k.lbl}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: k.clr, fontWeight: 600 }}>{k.val}</div>
                            </div>
                          ))}
                        </div>
                        {deel.soort === "aflossingsvrij" && (
                          <div style={{ marginTop: 10, fontSize: 12, color: C.gold, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                            ⚠ Aflossingsvrij: op de einddatum ({c.eindjaar || "?"}) is {eur(deel.hoofdsom)} ineens opeisbaar.
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div style={{ padding: "14px 18px", background: hypotheekVrij ? C.greenPale : C.goldPale, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Op stopleeftijd ({profiel.stopLeeftijd} jaar)</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                          {hypotheekVrij ? "✓ Alle leningdelen afgelost — hypotheekvrij!" : `Resterende maandlast: ${eur(hypoOpStop)}/mnd`}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 600, color: hypotheekVrij ? C.greenLight : C.gold }}>
                        {hypotheekVrij ? "Hypotheekvrij ✓" : `${eur(hypoOpStop)}/mnd`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Categorie accordeons */}
            {CATS.map(groep => {
              const isOpen = openGroep === groep.groep;
              const totaal = groep.items.reduce((s, item) => {
                const v = effLs[item.key] || 0;
                return s + (item.div ? v / item.div : v);
              }, 0);
              return (
                <Card key={groep.groep} style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                  <button onClick={() => setOpenGroep(isOpen ? null : groep.groep)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: groep.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{groep.icon} {groep.groep}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: groep.color, fontWeight: 600 }}>{eur(totaal)}/mnd</span>
                      <span style={{ color: C.muted, fontSize: 16 }}>{isOpen ? "∧" : "∨"}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                        {groep.items.map(item => {
                          const v  = effLs[item.key] || 0;
                          const bM = item.div ? item.bench / item.div : item.bench;
                          const vM = item.div ? v / item.div : v;
                          const low = bM > 50 && vM > 0 && vM < bM * 0.5;
                          return (
                            <div key={item.key}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{item.label}</span>
                                {item.info && <span title={item.info} style={{ width: 15, height: 15, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, fontSize: 9, color: C.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0 }}>?</span>}
                              </div>
                              {item.auto ? (
                                <div style={{ background: C.goldPale, border: `1px solid ${C.gold}30`, borderRadius: 10, padding: "9px 14px", display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 12, color: C.muted }}>Auto berekend</span>
                                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: C.gold, fontWeight: 600 }}>{eur(autoOnderhoud)}/mnd</span>
                                </div>
                              ) : (
                                <div>
                                  <Inp value={v} onChange={val => setL(item.key, val)} suffix={item.suffix} />
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                                    <div style={{ flex: 1, background: C.surface, borderRadius: 3, height: 3 }}>
                                      <div style={{ width: `${bM > 0 ? Math.min(100, (vM / (bM * 1.5)) * 100) : 0}%`, height: "100%", background: low ? C.gold : groep.color, borderRadius: 3, transition: "width 0.4s" }} />
                                    </div>
                                    <span style={{ fontSize: 10, color: C.dim, whiteSpace: "nowrap" }}>gem. {eur(bM)}/mnd</span>
                                  </div>
                                  {low && <div style={{ fontSize: 11, color: C.gold, marginTop: 3 }}>Lijkt laag — gemiddelde is {eur(bM)}/mnd</div>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Totaal */}
            <Card style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: C.text }}>Totale maanduitgaven</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>jouw vrijheidsgetal</div>
                  {hypotheekVrij && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 4 }}>✓ Hypotheekvrij op stopleeftijd</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, color: C.gold, fontWeight: 500 }}>{eur(maandOpStop)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>/mnd op stopleeftijd · nu {eur(maandNu)}</div>
                </div>
              </div>
              {(missend.length > 0 || telaag.length > 0) && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {missend.length > 0 && <InfoBox type="let_op"><strong>{missend.length} categorieën staan op €0:</strong> {missend.map(m => m.label).join(", ")}. Controleer of dit klopt.</InfoBox>}
                  {telaag.length > 0 && <InfoBox><strong>{telaag.length} categorieën lijken laag:</strong> {telaag.map(w => w.label).join(", ")}.</InfoBox>}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <InfoBox>Over {jarenTotStop} jaar kost dit door inflatie <strong>{eur(jaarOpStop)} per jaar</strong> (2,5%/jaar).</InfoBox>
              </div>
            </Card>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStap(0)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(2)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Vermogen</button>
            </div>
          </div>
        )}

        {/* ── STAP 3: VERMOGEN ── */}
        {stap === 2 && (
          <Card accent={C.greenLight}>
            <Kop size={26} sub="Wat heb je al opgebouwd? En hoeveel leg je maandelijks in?">Huidig vermogen</Kop>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
              {[
                { k: "beleggingen", lbl: "Beleggingsrekening",     info: "Totale waarde van al je beleggingen vandaag." },
                { k: "sparen",      lbl: "Spaargeld / cashbuffer", info: "Vrij opneembaar spaargeld." },
                { k: "lijfrente",   lbl: "Pensioen / lijfrente",   info: "Zelf opgebouwde pensioenrekening. Vrijgesteld van Box 3." },
                { k: "overig",      lbl: "Overige bezittingen",    info: "Overwaarde woning, crypto, etc." },
              ].map(f => (
                <div key={f.k}>
                  <Lbl info={f.info}>{f.lbl}</Lbl>
                  <Inp value={verm[f.k]} onChange={v => setV(f.k, v)} prefix="€" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <Slider label="Maandelijkse inleg" value={verm.inleg} onChange={v => setV("inleg", v)} min={0} max={5000} step={50} fmt={v => `${eur(v)}/mnd`} />
              <Slider label="Verwacht rendement" value={verm.rendement} onChange={v => setV("rendement", v)} min={2} max={12} step={0.5} fmt={v => `${v}% per jaar`} />
            </div>
            <div style={{ marginTop: 24 }}>
              <BarVoortgang value={Math.min(verm.sparen, cashNodig)} max={cashNodig} color={heeftBuffer ? C.greenLight : C.gold}
                label="Cashbuffer — aanbevolen 6 maanden uitgaven"
                sub={`${eur(cashNodig)} nodig · ${heeftBuffer ? "✓ Voldoende" : `Tekort: ${eur(cashNodig - verm.sparen)}`}`} />
              <div style={{ marginTop: 10 }}>
                {heeftBuffer
                  ? <InfoBox type="goed">Gezonde cashbuffer. Alles boven {eur(cashNodig)} kan actief belegd worden.</InfoBox>
                  : <InfoBox>Bouw eerst een buffer van 6 maanden ({eur(cashNodig)}) op voordat je agressiever belegt.</InfoBox>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStap(1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(3)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Pensioen & AOW</button>
            </div>
          </Card>
        )}

        {/* ── STAP 4: PENSIOEN ── */}
        {stap === 3 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Pensioen is vermogen dat je later ontgrendelt. We rekenen alles mee.">Pensioen & AOW</Kop>
            <div style={{ marginTop: 20, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>AOW-leeftijd: {aow.leeftijd} jaar — {aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>{aow.disclaimer}</div>}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>
                  {eur(AOW_MAAND)}/mnd
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { k: "werkgever",  lbl: "Werkgeverspensioen op pensioenleeftijd", info: "Zie je UPO via mijnpensioenoverzicht.nl.", sfx: "/mnd"  },
                { k: "eigen",      lbl: "Eigen pensioen / lijfrente",             info: "Banksparen of lijfrente.", sfx: "/mnd"  },
                { k: "jaarruimte", lbl: "Jaarlijkse lijfrente-inleg nu",          info: "Hoeveel je per jaar inlegt in een fiscaal aantrekkelijk product.", sfx: "/jaar" },
              ].map(f => (
                <div key={f.k}>
                  <Lbl info={f.info}>{f.lbl}</Lbl>
                  <Inp value={pens[f.k]} onChange={v => setPn(f.k, v)} prefix="€" suffix={f.sfx} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <Card style={{ background: C.greenPale, border: `1px solid ${C.greenLight}40` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Jaarruimte 2025</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>De jaarruimte is het bedrag dat je fiscaal aftrekbaar in een lijfrente mag inleggen. Je verlaagt nu je Box 1 belasting én bouwt pensioenkapitaal op.</p>
                <div style={{ display: "flex", justifyContent: "space-between", background: C.card, borderRadius: 8, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Geschatte jaarruimte voor jou</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: C.greenLight, fontWeight: 700 }}>{eur(jaarruimteCalc)}/jaar</span>
                </div>
                {pens.jaarruimte < jaarruimteCalc && (
                  <div style={{ marginTop: 10 }}>
                    <InfoBox type="goed">Je benut {eur(pens.jaarruimte)} van {eur(jaarruimteCalc)}. <strong>{eur(jaarruimteCalc - pens.jaarruimte)} extra</strong> mag belastingvrij ingelegd.</InfoBox>
                  </div>
                )}
              </Card>
              {aowGat && <InfoBox type="let_op">AOW-gat: {jarenGat} jaar. Zorg voor minimaal {eur(maandNu * 12 * jarenGat)} liquide om de periode tot je {aow.leeftijd}e te overbruggen.</InfoBox>}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStap(2)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(4)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Bekijk mijn vrijheidsplan →</button>
            </div>
          </Card>
        )}

        {/* ── STAP 5: PROGNOSE ── */}
        {stap === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card accent={doelBereikt ? C.greenLight : C.gold} style={{ background: doelBereikt ? C.greenPale : C.goldPale }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <Kop size={28}>{profiel.naam ? `${profiel.naam}, ` : ""}{doelBereikt ? "jouw vrijheid is haalbaar 🎉" : "bijna daar — kleine aanpassing nodig ✦"}</Kop>
                  <p style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 500 }}>
                    Op {profiel.stopLeeftijd}-jarige leeftijd heb je naar schatting <strong>{eur(vermOpStop)}</strong> opgebouwd. Je hebt <strong>{eur(benodigdKap)}</strong> nodig.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 42, fontWeight: 500, color: doelBereikt ? C.greenLight : C.gold, lineHeight: 1 }}>
                    {doelBereikt ? "+" : "-"}{eur(Math.abs(verschil))}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{doelBereikt ? "overschot" : "tekort"}</div>
                </div>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              <Metric label="Benodigde kapitaal" value={eur(benodigdKap)} accent={C.gold} sub="3,5% onttrekkingsregel" />
              <Metric label="Prognose stopleeftijd" value={eur(vermOpStop)} accent={doelBereikt ? C.greenLight : C.red} sub={`Bij ${verm.rendement}% rendement`} />
              <Metric label="Vrijheidsgetal" value={`${eur(maandOpStop)}/mnd`} accent={C.gold} sub={hypotheekVrij ? "Hypotheekvrij ✓" : "Op stopleeftijd"} />
              <Metric label="Passief inkomen" value={`${eur(aowBij + pensBij)}/mnd`} accent={C.greenLight} sub={`Vanaf ${aow.leeftijd} jaar`} />
            </div>

            <Card>
              <Kop size={18} sub="Jouw vermogensontwikkeling tot aan de stopleeftijd">Vermogensprognose</Kop>
              <div style={{ height: 300, marginTop: 16 }}>
                <ResponsiveContainer>
                  <AreaChart data={progData}>
                    <defs>
                      <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.greenLight} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.greenLight} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<TipTool />} />
                    <ReferenceLine y={benodigdKap} stroke={C.gold} strokeDasharray="6 3"
                      label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="vermogen" name="Vermogen" stroke={C.greenLight} fill="url(#vg)" strokeWidth={2.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Kop size={18} sub="Wat als je iets aanpast?">Scenario&apos;s</Kop>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 16 }}>
                {[
                  { lbl: "€200 meer/mnd inleggen", extraInleg: 200, extraJaar: 0, extraRend: 0 },
                  { lbl: `1 jaar later stoppen (${profiel.stopLeeftijd + 1}j)`, extraInleg: 0, extraJaar: 1, extraRend: 0 },
                  { lbl: `7% rendement i.p.v. ${verm.rendement}%`, extraInleg: 0, extraJaar: 0, extraRend: 7 - verm.rendement },
                ].map((sc, i) => {
                  const scData = bouwPrognose(leeftijd, profiel.stopLeeftijd + sc.extraJaar, totaalVerm, verm.inleg + sc.extraInleg, (verm.rendement + sc.extraRend) / 100, benodigdKap);
                  const scVerm = scData.find(d => d.leeftijd === profiel.stopLeeftijd + sc.extraJaar)?.vermogen || 0;
                  const diff = scVerm - vermOpStop;
                  return (
                    <div key={i} style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>{sc.lbl}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, color: diff >= 0 ? C.greenLight : C.red, fontWeight: 600 }}>
                        {diff >= 0 ? "+" : ""}{eur(diff)}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>effect op stopleeftijd</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card accent={C.gold}>
              <Kop size={18} sub="Concrete stappen die je vandaag kunt zetten">Jouw actieplan</Kop>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  !heeftBuffer && { icon: "🛡", title: "Bouw eerst je cashbuffer op", text: `Je hebt nog ${eur(cashNodig - verm.sparen)} nodig voor 6 maanden buffer.` },
                  pens.jaarruimte < jaarruimteCalc && { icon: "💰", title: "Benut je jaarruimte volledig", text: `Je kunt nog ${eur(jaarruimteCalc - pens.jaarruimte)}/jaar extra inleggen in een lijfrente.` },
                  aowGat && { icon: "⏳", title: `Plan je AOW-gat van ${jarenGat} jaar`, text: `Je hebt ${eur(maandNu * 12 * jarenGat)} nodig om te overbruggen tot je ${aow.leeftijd}e.` },
                  !aow.zeker && { icon: "📋", title: "Houd AOW-wijzigingen bij", text: "Jouw AOW-leeftijd is nog niet officieel vastgesteld. Check jaarlijks rijksoverheid.nl." },
                  hypotheekVrij && { icon: "🏠", title: "Hypotheekvrij voordeel", text: `Je bent hypotheekvrij op je stopleeftijd. Maandlast van ${eur(hypoMaandNu)} valt weg.` },
                  leningen.some(d => d.soort === "aflossingsvrij") && { icon: "⚠️", title: "Check je aflossingsvrije hypotheek", text: "Op de einddatum is de volledige hoofdsom ineens opeisbaar. Zorg voor een herfinancieringsplan." },
                  !doelBereikt && { icon: "📈", title: "Verhoog je maandelijkse inleg", text: `Met ${eur(Math.abs(verschil / (jarenTotStop * 12) * 1.2))} extra per maand bereik je je doel op tijd.` },
                  doelBereikt && { icon: "✦", title: "Je bent op koers", text: `Blijf consequent inleggen en herbalanceer jaarlijks. Over ${jarenTotStop} jaar pluk je de vruchten.` },
                ].filter(Boolean).map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, padding: 14, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3 }}>{a.title}</div>
                      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "12px 16px" }}>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                ⚠️ <strong>Indicatieve berekening</strong> — gebaseerd op constante rendementen, 2,5% inflatie en huidige belastingregels. AOW-leeftijden kunnen wijzigen door wetgeving. Geen financieel advies. Alle data blijft lokaal in je browser.
              </p>
            </div>
            <button onClick={() => setStap(3)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14, width: "fit-content" }}>← Aanpassen</button>
          </div>
        )}
      </div>
    </div>
  );
}

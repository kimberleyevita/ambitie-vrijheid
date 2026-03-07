import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';
import { C } from '../tokens.js';
import { INFLATIE, FIRE_PCT } from '../tokens.js';
import {
  eur, berekenOnderhoud, berekenAow, berekenHypoDeel,
  bouwAccountPrognose, bouwPrognose, berekenJaarruimte,
  AOW_ALLEENSTAAND, AOW_SAMENWONEND,
  ACCOUNT_CATS, SPAARRENTE_FALLBACK, SPAARRENTE_DATUM,
} from '../utils.js';
import { CATS, ALLE_ITEMS, VERZEKERING_OPTIES } from '../data/lifestyle.js';
import { Card, Kop, Lbl, Slider, Metric, InfoBox, BarVoortgang, StapBtn, TipTool } from './Atoms.jsx';

const STAPPEN = [
  { id: "profiel",   label: "Jouw situatie"       },
  { id: "lifestyle", label: "Gewenste levensstijl" },
  { id: "vermogen",  label: "Jouw geld"            },
  { id: "pensioen",  label: "Pensioen & AOW"       },
  { id: "prognose",  label: "Jouw vrijheidsplan"   },
];

const UITWONEN_LEEFTIJD = 23;

// ─── Herbruikbare UI-componenten ──────────────────────────────────────────────

function NumInp({ value, onChange, prefix, suffix, placeholder, style }) {
  const [raw, setRaw] = useState(value === 0 || value === "" ? "" : String(value));
  useEffect(() => {
    if (document.activeElement?.dataset?.controlled !== "1") {
      setRaw(value === 0 || value === "" ? "" : String(value));
    }
  }, [value]);
  function handleChange(e) { setRaw(e.target.value); const n = parseFloat(e.target.value); onChange(isNaN(n) ? 0 : n); }
  function handleBlur()    { const n = parseFloat(raw); setRaw(isNaN(n) || n === 0 ? "" : String(n)); }
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && <span style={{ position: "absolute", left: 12, fontSize: 13, color: C.muted, pointerEvents: "none", zIndex: 1 }}>{prefix}</span>}
      <input data-controlled="1" type="number" value={raw} placeholder={placeholder || "0"} onChange={handleChange} onBlur={handleBlur}
        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", paddingLeft: prefix ? 26 : 12, paddingRight: suffix ? 44 : 12, fontSize: 14, color: C.text, fontFamily: "'DM Mono',monospace", ...style }} />
      {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
    </div>
  );
}

function CheckBox({ checked, onChange, label, sub }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, border: `2px solid ${checked ? C.gold : C.border}`, background: checked ? C.goldPale : C.surface, cursor: "pointer" }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? C.gold : C.border}`, background: checked ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: checked ? C.gold : C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ScenTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: p.color }}>{eur(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── HOOFDCOMPONENT ──────────────────────────────────────────────────────────
export default function VrijheidsWizard() {
  const [stap, setStap]           = useState(0);
  const [openGroep, setOpenGroep] = useState("Wonen");
  const [spaarrente, setSpaarrente] = useState(SPAARRENTE_FALLBACK);

  // ── Profiel ──
  const [profiel, setProfiel] = useState({
    naam: "", geboortejaar: "", stopLeeftijd: 55, inkomen: "",
    partner: false, werkType: "loondienst", kinderen: [],
    partnerVerdeling: 50, // 50 = 50/50, 70 = jij 70%, partner 30%
  });

  // ── Lifestyle ──
  const defLS = Object.fromEntries(ALLE_ITEMS.map(i => [i.key, 0]));
  const [ls, setLs] = useState({ ...defLS, woningWaarde: 0, bouwjaar: 0, huurder: false, onderhoudOverride: null });
  const [verzek, setVerzek]     = useState([]);
  const [verzekOpen, setVerzekOpen] = useState(false);
  const [leningen, setLeningen] = useState([]);

  // ── Vermogen: accounts-model ──
  // Elke rekening: { id, label, catId, waarde, inlegMnd, rendement }
  const [accounts, setAccounts] = useState([]);

  // ── Pensioen ──
  const [pens, setPens] = useState({
    heeftWerkgever: false, werkgever: 0, werkgeverLeeftijd: 68,
    heeftEigen: false, eigen: 0, eigenLeeftijd: 68,
    jaarruimteInleg: 0, factorA: 0,
  });

  // ── Afgeleide waarden ──────────────────────────────────────────────────────
  const gbjaar       = parseInt(profiel.geboortejaar) || 1985;
  const leeftijd     = 2025 - gbjaar;
  const aow          = berekenAow(gbjaar);
  const stopLft      = profiel.stopLeeftijd;
  const jarenTotStop = Math.max(0, stopLft - leeftijd);
  const stopJaar     = 2025 + jarenTotStop;
  const aowGat       = stopLft < aow.leeftijd;
  const jarenGat     = aowGat ? aow.leeftijd - stopLft : 0;
  const aowMaand     = profiel.partner ? AOW_SAMENWONEND : AOW_ALLEENSTAAND;

  // Partner: jouw aandeel in de lasten
  const partnerAandeel = profiel.partner ? (profiel.partnerVerdeling / 100) : 1.0;

  // Kinderen
  const kinderenWegOpStop = profiel.kinderen.filter(k => (gbjaar + stopLft - k.geboortejaar) >= UITWONEN_LEEFTIJD);
  const kostenPerKindMnd  = profiel.kinderen.length > 0 ? (ls.kinderen / profiel.kinderen.length) : 0;
  const kinderKostenWeg   = kinderenWegOpStop.length * kostenPerKindMnd;

  // Woning
  const autoOnderhoud  = (ls.woningWaarde > 0 && ls.bouwjaar > 0 && !ls.huurder) ? berekenOnderhoud(ls.woningWaarde, ls.bouwjaar) : 0;
  const onderhoudMaand = ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud;

  // Hypotheek
  const leningCalc      = leningen.map(d => ({ ...d, ...berekenHypoDeel(d) }));
  const hypoMaandNu     = leningCalc.reduce((s, d) => s + d.maand, 0);
  const hypoRestschuld  = leningCalc.reduce((s, d) => s + d.restschuld, 0);
  const hypoOpStop      = leningCalc.reduce((s, d) => d.eindjaar > stopJaar ? s + d.maand : s, 0);
  const hypotheekVrij   = !ls.huurder && leningen.length > 0 && hypoOpStop === 0;

  // Aflossingsschema voor grafiek
  const aflossingsData = (() => {
    if (!leningen.length) return [];
    const jaren = {};
    leningCalc.forEach(l => (l.schema || []).forEach(s => { jaren[s.jaar] = (jaren[s.jaar] || 0) + s.restschuld; }));
    return Object.entries(jaren).map(([j, r]) => ({ jaar: +j, leeftijd: +j - 2025 + leeftijd, restschuld: r })).sort((a, b) => a.jaar - b.jaar);
  })();

  // Verzekeringen
  const verzekMaand = verzek.reduce((s, v) => s + (v.bedrag || 0), 0);

  // Levensstijl totaal (jouw aandeel)
  const effLs   = { ...ls, onderhoud: onderhoudMaand, huurHypo: !ls.huurder && hypoMaandNu > 0 ? hypoMaandNu : ls.huurHypo };
  const maandBruto = ALLE_ITEMS.reduce((s, item) => {
    if (item.key === "onderhoud") return s + onderhoudMaand;
    const v = effLs[item.key] || 0;
    return s + (item.div ? v / item.div : v);
  }, 0) + verzekMaand;
  const maandNu = maandBruto * partnerAandeel;

  let maandOpStop = maandNu;
  if (!ls.huurder && hypoMaandNu > 0) maandOpStop = maandOpStop - (hypoMaandNu * partnerAandeel) + (hypoOpStop * partnerAandeel);
  maandOpStop = Math.max(0, maandOpStop - kinderKostenWeg * partnerAandeel);

  const jaarOpStop  = maandOpStop * 12 * Math.pow(1 + INFLATIE, jarenTotStop);
  const cashNodig   = maandNu * 6;

  // Jaarruimte
  const jaarruimteCalc = berekenJaarruimte(parseFloat(profiel.inkomen) || 0, profiel.werkType, pens.factorA);

  // Pensioen & AOW beschikbaar op stopleeftijd
  const aowBij       = aowGat ? 0 : aowMaand;
  const pensBij      = (pens.heeftWerkgever && !aowGat) ? pens.werkgever : 0;
  const eigenPensBij = (pens.heeftEigen && !aowGat) ? pens.eigen : 0;
  const totaalPassief = aowBij + pensBij + eigenPensBij;

  // Benodigde pot
  const benodigdPot = Math.max(0, jaarOpStop - totaalPassief * 12) / FIRE_PCT;

  // Accounts totaal
  const totaalVerm   = accounts.reduce((s, a) => s + (a.waarde || 0), 0);
  const totaalInleg  = accounts.reduce((s, a) => s + (a.inlegMnd || 0), 0);

  // Prognose
  const scenarios    = accounts.length > 0
    ? bouwAccountPrognose(leeftijd, stopLft, accounts.map(a => ({ id: a.id, waarde: a.waarde || 0, inlegMnd: a.inlegMnd || 0, rendement: a.rendement || 0.05 })), benodigdPot)
    : { pess: [], midden: [], opt: [] };

  const grafData = (scenarios.midden || []).map((d, i) => ({
    ...d,
    pess: scenarios.pess[i]?.vermogen,
    opt:  scenarios.opt[i]?.vermogen,
  }));

  const vermOpStopM = scenarios.midden.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const vermOpStopP = scenarios.pess.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const vermOpStopO = scenarios.opt.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const verschil     = vermOpStopM - benodigdPot;
  const doelBereikt  = verschil >= 0;
  const pessOk       = vermOpStopP >= benodigdPot;

  // Maandelijks inkomen op stopleeftijd (uit pot + passief)
  const inkomenUitPot    = vermOpStopM * FIRE_PCT / 12;
  const totaalMaandInkomen = inkomenUitPot + totaalPassief;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setL  = (k, v) => setLs(p => ({ ...p, [k]: v }));
  const setP  = (k, v) => setProfiel(p => ({ ...p, [k]: v }));
  const setPn = (k, v) => setPens(p => ({ ...p, [k]: v }));

  function addKind() { setP("kinderen", [...profiel.kinderen, { id: Date.now(), geboortejaar: 2015 }]); }
  function delKind(id) { setP("kinderen", profiel.kinderen.filter(k => k.id !== id)); }
  function updKind(id, gb) { setP("kinderen", profiel.kinderen.map(k => k.id === id ? { ...k, geboortejaar: gb } : k)); }

  function addLening() {
    setLeningen(p => [...p, { id: Date.now(), label: `Leningdeel ${String.fromCharCode(65 + p.length)}`, hoofdsom: 0, rente: 0, looptijdJaar: 30, startjaar: 2020, soort: "annuiteit" }]);
  }
  const delLening = (id) => setLeningen(p => p.filter(d => d.id !== id));
  const updLening = (id, k, v) => setLeningen(p => p.map(d => d.id === id ? { ...d, [k]: v } : d));

  function toggleVerzek(id) {
    if (verzek.find(v => v.id === id)) { setVerzek(p => p.filter(v => v.id !== id)); return; }
    const opt = VERZEKERING_OPTIES.find(o => o.id === id);
    setVerzek(p => [...p, { id, bedrag: opt?.bench || 0 }]);
  }
  const updVerzekBedrag = (id, b) => setVerzek(p => p.map(v => v.id === id ? { ...v, bedrag: b } : v));

  function addAccount(catId) {
    const cat = ACCOUNT_CATS.find(c => c.id === catId);
    const rend = catId === "sparen" ? spaarrente : (cat?.rendMidden || 0.05);
    setAccounts(p => [...p, { id: Date.now(), label: cat?.label || "Rekening", catId, waarde: 0, inlegMnd: 0, rendement: rend }]);
  }
  const delAccount    = (id) => setAccounts(p => p.filter(a => a.id !== id));
  const updAccount    = (id, k, v) => setAccounts(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28 }}>

      {/* Sidebar */}
      <div>
        <Card style={{ position: "sticky", top: 80 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Jouw plan</div>
          {STAPPEN.map((s, i) => <StapBtn key={s.id} nr={i+1} active={stap===i} done={stap>i} label={s.label} onClick={() => setStap(i)} />)}
          {stap === 4 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: doelBereikt ? C.greenPale : C.redPale, borderRadius: 10, border: `1px solid ${(doelBereikt ? C.greenLight : C.red)}40` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: doelBereikt ? C.green : C.red }}>{doelBereikt ? "✓ Doel bereikbaar" : "⚠ Bijstelling nodig"}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{doelBereikt ? `${eur(verschil)} overschot` : `${eur(Math.abs(verschil))} tekort`}</div>
            </div>
          )}
        </Card>
      </div>

      <div className="fu">

        {/* ════════════════════════════════════════
            STAP 1 — PROFIEL
        ════════════════════════════════════════ */}
        {stap === 0 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Laten we beginnen met de basis. Alle berekeningen blijven privé op jouw apparaat — we slaan niets op.">Vertel ons iets over jezelf</Kop>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 24 }}>

              <div><Lbl>Naam (optioneel)</Lbl><input type="text" value={profiel.naam} onChange={e => setP("naam", e.target.value)} placeholder="Voor de persoonlijke touch" style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, color: C.text }} /></div>

              <div>
                <Lbl info="Je geboortejaar — we berekenen hieruit je leeftijd en wanneer je AOW krijgt.">Geboortejaar</Lbl>
                <NumInp value={profiel.geboortejaar} onChange={v => setP("geboortejaar", v)} placeholder="bijv. 1985" suffix={profiel.geboortejaar ? `(${leeftijd} jaar)` : ""} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Slider label="Wanneer wil je financieel vrij zijn?" value={stopLft} onChange={v => setP("stopLeeftijd", v)} min={leeftijd + 1} max={75} fmt={v => `${v} jaar (over ${v - leeftijd} jaar)`} />
              </div>

              <div>
                <Lbl info="Bruto jaarsalaris inclusief vakantiegeld. Als je zelfstandige bent: gemiddelde jaarwinst.">Bruto jaarinkomen</Lbl>
                <NumInp value={profiel.inkomen} onChange={v => setP("inkomen", v)} prefix="€" placeholder="bijv. 60.000" />
              </div>

              <div>
                <Lbl info="Dit bepaalt hoeveel ruimte je hebt om belastingvrij pensioen op te bouwen.">Werksituatie</Lbl>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["loondienst","In loondienst"],["zzp","ZZP / zelfstandige"]].map(([val,lbl]) => (
                    <button key={val} onClick={() => setP("werkType", val)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `2px solid ${profiel.werkType === val ? C.gold : C.border}`, background: profiel.werkType === val ? C.goldPale : C.surface, color: profiel.werkType === val ? C.gold : C.muted, fontWeight: profiel.werkType === val ? 600 : 400, fontSize: 13 }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Partner */}
              <div style={{ gridColumn: "1 / -1" }}>
                <CheckBox checked={profiel.partner} onChange={v => setP("partner", v)}
                  label="Ik plan samen met een partner"
                  sub={profiel.partner ? `Je AOW: ${eur(AOW_SAMENWONEND)}/mnd (samenwonend tarief)` : `Je AOW: ${eur(AOW_ALLEENSTAAND)}/mnd (alleenstaand)`} />
                {profiel.partner && (
                  <div style={{ marginTop: 12, background: C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.gold}30` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 10 }}>💑 Hoe verdelen jullie de vaste lasten?</div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
                      Vul hier in welk percentage <em>jij</em> betaalt. Dit past alle uitgaven aan voor jouw berekening. Later kun je per categorie een andere verdeling instellen als dat beter past.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>Jij betaalt:</span>
                      <input type="range" min={10} max={100} step={5} value={profiel.partnerVerdeling} onChange={e => setP("partnerVerdeling", +e.target.value)} style={{ flex: 1 }} />
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: C.gold, fontWeight: 600, minWidth: 50 }}>{profiel.partnerVerdeling}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 6 }}>
                      <span>Jij: {profiel.partnerVerdeling}%</span>
                      <span>Partner: {100 - profiel.partnerVerdeling}%</span>
                    </div>
                    <InfoBox style={{ marginTop: 10 }}>Alle bedragen in de berekening zijn <strong>jouw aandeel</strong>. Je partner maakt idealiter een eigen plan.</InfoBox>
                  </div>
                )}
              </div>

              {/* Kinderen */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Lbl info="Kinderen die voor je vrije leeftijd het huis uit gaan zorgen voor lagere kosten.">Kinderen</Lbl>
                  <button onClick={addKind} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 14px", fontSize: 13, color: C.muted }}>+ Kind toevoegen</button>
                </div>
                {profiel.kinderen.length === 0 && <div style={{ fontSize: 13, color: C.dim, fontStyle: "italic" }}>Geen kinderen ingevuld</div>}
                {profiel.kinderen.map(k => {
                  const lftStop = gbjaar + stopLft - k.geboortejaar;
                  const uitHuis = lftStop >= UITWONEN_LEEFTIJD;
                  return (
                    <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 14px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 18 }}>👶</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: C.muted }}>Geboortejaar:</span>
                          <input type="number" value={k.geboortejaar} onChange={e => updKind(k.id, parseInt(e.target.value) || 2015)} style={{ width: 80, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 13, fontFamily: "'DM Mono',monospace", color: C.text }} />
                          <span style={{ fontSize: 12, color: C.muted }}>({2025 - k.geboortejaar} jaar nu)</span>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, color: uitHuis ? C.greenLight : C.gold, fontWeight: 500 }}>
                          {uitHuis ? `✓ Op vrije leeftijd al ${lftStop} jaar — kosten vallen weg` : `Op vrije leeftijd ${lftStop} jaar — nog thuis`}
                        </div>
                      </div>
                      <button onClick={() => delKind(k.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>
                  );
                })}
                {kinderenWegOpStop.length > 0 && <InfoBox type="goed">{kinderenWegOpStop.length} {kinderenWegOpStop.length === 1 ? "kind" : "kinderen"} zijn op je vrije leeftijd al het huis uit — bespaart <strong>{eur(kinderKostenWeg * partnerAandeel)}/mnd</strong>.</InfoBox>}
              </div>
            </div>

            {/* AOW indicator */}
            <div style={{ marginTop: 20, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "14px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>AOW-leeftijd: <span style={{ fontFamily: "'DM Mono',monospace", color: aow.zeker ? C.greenLight : C.gold }}>{aow.leeftijd} jaar</span></div>
                  <div style={{ fontSize: 12, color: C.muted }}>{aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 6, lineHeight: 1.6 }}>⚠️ {aow.disclaimer}</div>}
                  {aowGat && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: C.red }}>Je stopt {jarenGat} jaar vóór je AOW — je moet dit zelf overbruggen</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{profiel.partner ? "samenwonend" : "alleenstaand"}</div>
                  <span style={{ fontSize: 10, background: aow.zeker ? `${C.greenLight}20` : `${C.gold}20`, color: aow.zeker ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase", display: "inline-block", marginTop: 4 }}>{aow.zeker ? "Officieel ✓" : "Schatting"}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <InfoBox>Je wil financieel vrij zijn op <strong>{stopLft} jaar</strong> — over <strong>{jarenTotStop} jaar</strong>. {aowGat ? `Je ontvangt pas AOW op ${aow.leeftijd} jaar — je moet ${jarenGat} jaar zelf overbruggen.` : `Op die leeftijd ontvang je al ${eur(aowMaand)}/mnd AOW van de overheid.`}</InfoBox>
            </div>

            <button onClick={() => setStap(1)} style={{ marginTop: 20, background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Levensstijl</button>
          </Card>
        )}

        {/* ════════════════════════════════════════
            STAP 2 — LIFESTYLE
        ════════════════════════════════════════ */}
        {stap === 1 && (
          <div>
            <Card accent={C.gold} style={{ marginBottom: 14 }}>
              <Kop size={26} sub="Hoe wil jij leven als je financieel vrij bent? Wees eerlijk — dit is jouw droomscenario.">Gewenste levensstijl</Kop>
              {profiel.partner && (
                <InfoBox style={{ marginTop: 14 }}>Je betaalt <strong>{profiel.partnerVerdeling}%</strong> van de gedeelde lasten. Het totaal hieronder is jouw aandeel.</InfoBox>
              )}

              {/* Woninggegevens */}
              <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, marginBottom: 14, color: C.text }}>🏠 Woninggegevens</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div><Lbl>Woningwaarde (WOZ)</Lbl><NumInp value={ls.woningWaarde} onChange={v => setL("woningWaarde", v)} prefix="€" placeholder="bijv. 400.000" /></div>
                  <div><Lbl info="Bouwjaar bepaalt hoe hoog het onderhoud is. Oudere woningen vragen meer.">Bouwjaar</Lbl><NumInp value={ls.bouwjaar} onChange={v => setL("bouwjaar", v)} placeholder="bijv. 1995" /></div>
                  <div>
                    <Lbl info="Automatisch berekend op basis van woningwaarde en bouwjaar. Je kunt dit zelf aanpassen als het niet klopt.">Onderhoud/mnd</Lbl>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <NumInp value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud} onChange={v => setL("onderhoudOverride", v)} prefix="€" placeholder="0" />
                      {ls.onderhoudOverride !== null && <button onClick={() => setL("onderhoudOverride", null)} style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.gold, whiteSpace: "nowrap" }}>↺ auto</button>}
                    </div>
                    {ls.onderhoudOverride === null && autoOnderhoud > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Berekend: {eur(autoOnderhoud)}/mnd — klik om te wijzigen</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="huurder" checked={ls.huurder} onChange={e => setL("huurder", e.target.checked)} />
                    <label htmlFor="huurder" style={{ fontSize: 13, color: C.text, cursor: "pointer", whiteSpace: "nowrap" }}>Ik huur</label>
                  </div>
                </div>
              </div>

              {/* Hypotheek */}
              {!ls.huurder && (
                <div style={{ marginTop: 14, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: C.text }}>🏦 Hypotheek</div>
                      {leningen.length > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Nu: <span style={{ fontFamily: "'DM Mono',monospace", color: C.gold, fontWeight: 600 }}>{eur(hypoMaandNu)}/mnd</span> · Restschuld: <span style={{ fontFamily: "'DM Mono',monospace", color: C.red, fontWeight: 600 }}>{eur(hypoRestschuld)}</span></div>}
                    </div>
                    <button onClick={addLening} style={{ background: C.gold, border: "none", borderRadius: 9, padding: "7px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>+ Leningdeel</button>
                  </div>
                  {leningen.length === 0 && <div style={{ padding: "16px 18px", color: C.dim, fontSize: 13, fontStyle: "italic" }}>Geen hypotheek? Dan hoef je hier niets in te vullen.</div>}
                  {leningen.map((deel, idx) => {
                    const c = leningCalc.find(b => b.id === deel.id) || {};
                    const aflVoorStop = c.eindjaar && c.eindjaar <= stopJaar;
                    return (
                      <div key={deel.id} style={{ padding: "16px 18px", borderBottom: idx < leningen.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <input value={deel.label} onChange={e => updLening(deel.id, "label", e.target.value)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "2px 4px", width: 140 }} />
                            <span style={{ fontSize: 10, background: aflVoorStop ? `${C.greenLight}20` : `${C.gold}18`, color: aflVoorStop ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600 }}>{aflVoorStop ? `✓ Afgelost (${c.eindjaar})` : `Loopt t/m ${c.eindjaar || "?"}`}</span>
                          </div>
                          <button onClick={() => delLening(deel.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                          <div><Lbl>Hoofdsom</Lbl><NumInp value={deel.hoofdsom} onChange={v => updLening(deel.id, "hoofdsom", v)} prefix="€" placeholder="0" /></div>
                          <div><Lbl>Rente</Lbl><NumInp value={deel.rente} onChange={v => updLening(deel.id, "rente", v)} suffix="%" placeholder="0" /></div>
                          <div><Lbl info="Totale looptijd in jaren — resterende looptijd wordt automatisch berekend.">Looptijd</Lbl><NumInp value={deel.looptijdJaar} onChange={v => updLening(deel.id, "looptijdJaar", v)} suffix="jaar" placeholder="30" /></div>
                          <div><Lbl info="Jaar dat de hypotheek is afgesloten.">Startjaar</Lbl><NumInp value={deel.startjaar} onChange={v => updLening(deel.id, "startjaar", v)} placeholder="2020" /></div>
                          <div>
                            <Lbl info="Annuïteit: vaste maandlast. Lineair: dalende maandlast. Aflossingsvrij: alleen rente betalen.">Soort</Lbl>
                            <select value={deel.soort} onChange={e => updLening(deel.id, "soort", e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text }}>
                              <option value="annuiteit">Annuïteit</option>
                              <option value="lineair">Lineair</option>
                              <option value="aflossingsvrij">Aflossingsvrij</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                          {[
                            { lbl: "Maandlast nu", val: `${eur(c.maand||0)}/mnd`, clr: C.gold },
                            { lbl: "Restschuld", val: eur(c.restschuld||0), clr: C.red },
                            { lbl: "Resterende looptijd", val: `${c.restLooptijdJaar||0} jaar`, clr: C.muted },
                            { lbl: `Op ${stopLft} jaar`, val: aflVoorStop ? "Afgelost ✓" : `${eur(c.maand||0)}/mnd`, clr: aflVoorStop ? C.greenLight : C.text },
                          ].map((k,i) => (
                            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
                              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{k.lbl}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: k.clr, fontWeight: 600 }}>{k.val}</div>
                            </div>
                          ))}
                        </div>
                        {deel.soort === "aflossingsvrij" && <div style={{ marginTop: 10, fontSize: 12, color: C.gold, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: "8px 12px" }}>⚠ Aflossingsvrij: op einddatum ({c.eindjaar||"?"}) is {eur(deel.hoofdsom)} ineens opeisbaar.</div>}
                      </div>
                    );
                  })}
                  {leningen.length > 0 && (
                    <div style={{ padding: "14px 18px", background: hypotheekVrij ? C.greenPale : C.goldPale, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Op vrije leeftijd ({stopLft} jaar)</div><div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{hypotheekVrij ? "✓ Alle leningen afgelost — hypotheekvrij!" : `Resterende maandlast: ${eur(hypoOpStop)}/mnd`}</div></div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 600, color: hypotheekVrij ? C.greenLight : C.gold }}>{hypotheekVrij ? "Hypotheekvrij ✓" : `${eur(hypoOpStop)}/mnd`}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Verzekeringen */}
            <Card style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setVerzekOpen(!verzekOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7a5a8a", flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>🛡️ Verzekeringen</span>
                  {verzek.length > 0 && <span style={{ fontSize: 11, background: `${C.gold}20`, color: C.gold, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{verzek.length} geselecteerd</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: "#7a5a8a", fontWeight: 600 }}>{eur(verzekMaand * partnerAandeel)}/mnd</span>
                  <span style={{ color: C.muted, fontSize: 16 }}>{verzekOpen ? "∧" : "∨"}</span>
                </div>
              </button>
              {verzekOpen && (
                <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 13, color: C.muted, margin: "14px 0 4px", lineHeight: 1.6 }}>Vink aan welke verzekeringen je hebt. <strong>De bedragen zijn gemiddelden</strong> — pas ze aan naar jouw situatie.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {[...VERZEKERING_OPTIES, { id: "overig_v", label: "Overige verzekeringen", bench: 0, info: "Vul hier zelf een verzekering in die er niet tussen staat." }].map(opt => {
                      const sel = verzek.find(v => v.id === opt.id);
                      return (
                        <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: sel ? C.goldPale : C.surface, borderRadius: 10, border: `1px solid ${sel ? C.gold+"60" : C.border}` }}>
                          <div onClick={() => toggleVerzek(opt.id)} style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${sel ? C.gold : C.border}`, background: sel ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            {sel && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleVerzek(opt.id)}>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: sel ? 600 : 400 }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.info}</div>
                          </div>
                          {sel && <NumInp value={sel.bedrag} onChange={v => updVerzekBedrag(opt.id, v)} suffix="/mnd" placeholder="0" style={{ width: 110 }} />}
                          {!sel && <div style={{ fontSize: 11, color: C.dim, flexShrink: 0, whiteSpace: "nowrap" }}>gem. {eur(opt.bench)}/mnd</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Categorie accordeons */}
            {CATS.map(groep => {
              const isOpen = openGroep === groep.groep;
              const totaalBruto = groep.items.reduce((s, item) => {
                if (item.key === "onderhoud") return s + onderhoudMaand;
                const v = effLs[item.key] || 0;
                return s + (item.div ? v / item.div : v);
              }, 0);
              const totaal = totaalBruto * partnerAandeel;
              return (
                <Card key={groep.groep} style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                  <button onClick={() => setOpenGroep(isOpen ? null : groep.groep)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none" }}>
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
                      {profiel.partner && (
                        <div style={{ margin: "12px 0 0", padding: "8px 12px", background: C.goldPale, borderRadius: 8, fontSize: 12, color: C.muted }}>
                          💡 Bedragen hieronder zijn het <strong>totaal</strong>. Jouw aandeel ({profiel.partnerVerdeling}%) wordt automatisch berekend.
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                        {groep.items.map(item => {
                          const v   = item.key === "onderhoud" ? onderhoudMaand : (effLs[item.key] || 0);
                          const bM  = item.div ? item.bench / item.div : item.bench;
                          const vM  = item.div ? v / item.div : v;
                          const low = bM > 50 && vM > 0 && vM < bM * 0.5;
                          return (
                            <div key={item.key}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{item.label}</span>
                                {item.info && <span title={item.info} style={{ width: 16, height: 16, borderRadius: "50%", background: C.goldPale, border: `1px solid ${C.gold}50`, fontSize: 10, color: C.gold, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0, fontWeight: 700 }}>?</span>}
                              </div>
                              {item.key === "onderhoud" ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <NumInp value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud} onChange={v => setL("onderhoudOverride", v)} prefix="€" suffix="/mnd" placeholder="0" />
                                  {ls.onderhoudOverride !== null && <button onClick={() => setL("onderhoudOverride", null)} style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 8px", fontSize: 10, color: C.gold }}>↺</button>}
                                </div>
                              ) : (
                                <div>
                                  <NumInp value={v} onChange={val => setL(item.key, val)} suffix={item.suffix} placeholder="0" />
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                                    <div style={{ flex: 1, background: C.surface, borderRadius: 3, height: 3 }}><div style={{ width: `${bM > 0 ? Math.min(100, (vM / (bM * 1.5)) * 100) : 0}%`, height: "100%", background: low ? C.gold : groep.color, borderRadius: 3 }} /></div>
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
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: C.text }}>Jouw maandelijkse uitgaven</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>wat je straks per maand nodig hebt</div>
                  {hypotheekVrij && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 3 }}>✓ Hypotheekvrij op vrije leeftijd</div>}
                  {kinderenWegOpStop.length > 0 && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 2 }}>✓ {kinderenWegOpStop.length} {kinderenWegOpStop.length === 1 ? "kind" : "kinderen"} uit huis ({eur(kinderKostenWeg * partnerAandeel)}/mnd minder)</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, color: C.gold, fontWeight: 500 }}>{eur(maandOpStop)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>/mnd op vrije leeftijd · nu {eur(maandNu)}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <InfoBox>Over {jarenTotStop} jaar kost dit door prijsstijgingen (2,5%/jaar) <strong>{eur(jaarOpStop)} per jaar</strong>.</InfoBox>
              </div>
            </Card>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStap(0)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(2)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Jouw geld</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            STAP 3 — VERMOGEN
        ════════════════════════════════════════ */}
        {stap === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card accent={C.greenLight}>
              <Kop size={26} sub="Voeg al je rekeningen en spaarpotten toe. Je ziet direct hoe ze groeien over de tijd.">Jouw geld</Kop>

              {/* Uitleg */}
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {ACCOUNT_CATS.map(cat => (
                  <div key={cat.id} style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cat.emoji} {cat.label}</div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: cat.kleur, fontWeight: 600, background: `${cat.kleur}18`, padding: "2px 8px", borderRadius: 6 }}>~{(cat.rendMidden * 100).toFixed(0)}%/jr</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{cat.uitleg}</div>
                    <button onClick={() => addAccount(cat.id)} style={{ marginTop: 10, background: `${cat.kleur}15`, border: `1px solid ${cat.kleur}40`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: cat.kleur, fontWeight: 600, cursor: "pointer" }}>+ Toevoegen</button>
                  </div>
                ))}
              </div>

              {/* Spaarrente melding */}
              <div style={{ marginTop: 12, background: C.goldPale, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.gold}30`, fontSize: 12, color: C.muted }}>
                💡 <strong>Spaarrente:</strong> We hanteren {(spaarrente * 100).toFixed(1)}% als standaard spaarrente (markttarief {SPAARRENTE_DATUM}). Dit is wat de meeste banken momenteel bieden op een vrij opneembare spaarrekening. Je kunt dit per rekening aanpassen.
              </div>

              {/* Toegevoegde accounts */}
              {accounts.length === 0 && (
                <div style={{ marginTop: 16, padding: "20px", textAlign: "center", color: C.dim, fontSize: 14, fontStyle: "italic" }}>
                  Klik op "+ Toevoegen" hierboven om je eerste rekening toe te voegen.
                </div>
              )}

              {accounts.map(acc => {
                const cat = ACCOUNT_CATS.find(c => c.id === acc.catId);
                return (
                  <div key={acc.id} style={{ marginTop: 10, background: C.surface, borderRadius: 12, border: `2px solid ${cat?.kleur || C.border}30`, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{cat?.emoji || "💼"}</span>
                        <input value={acc.label} onChange={e => updAccount(acc.id, "label", e.target.value)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, padding: "2px 4px", width: 180 }} />
                        <span style={{ fontSize: 11, background: `${cat?.kleur || C.gold}18`, color: cat?.kleur || C.gold, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{cat?.label}</span>
                      </div>
                      <button onClick={() => delAccount(acc.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <Lbl info="Hoeveel staat er nu op deze rekening?">Huidig saldo</Lbl>
                        <NumInp value={acc.waarde} onChange={v => updAccount(acc.id, "waarde", v)} prefix="€" placeholder="0" />
                      </div>
                      <div>
                        <Lbl info="Hoeveel leg je hier elke maand bij?">Maandelijkse inleg</Lbl>
                        <NumInp value={acc.inlegMnd} onChange={v => updAccount(acc.id, "inlegMnd", v)} prefix="€" suffix="/mnd" placeholder="0" />
                      </div>
                      <div>
                        <Lbl info={cat?.id === "sparen" ? "Rente die de bank betaalt. Volgt de marktrente." : `Verwacht jaarlijks rendement. Vuistregel: ${((cat?.rendBand?.[0]||0)*100).toFixed(0)}–${((cat?.rendBand?.[1]||0.1)*100).toFixed(0)}% voor dit type.`}>
                          Rendement/jaar
                        </Lbl>
                        <NumInp value={+(acc.rendement * 100).toFixed(1)} onChange={v => updAccount(acc.id, "rendement", v / 100)} suffix="%" placeholder="5" />
                        {cat?.rendBand && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Vuistregel: {(cat.rendBand[0]*100).toFixed(0)}–{(cat.rendBand[1]*100).toFixed(0)}%/jr voor dit type</div>}
                      </div>
                    </div>

                    {/* Mini prognose per account */}
                    {acc.waarde > 0 && (
                      <div style={{ marginTop: 12, background: `${cat?.kleur || C.gold}08`, borderRadius: 8, padding: "10px 14px", border: `1px solid ${cat?.kleur || C.gold}20` }}>
                        {(() => {
                          const waardeBij = acc.waarde * Math.pow(1 + acc.rendement, jarenTotStop) + acc.inlegMnd * 12 * ((Math.pow(1 + acc.rendement, jarenTotStop) - 1) / acc.rendement || jarenTotStop);
                          const groei = waardeBij - acc.waarde - acc.inlegMnd * 12 * jarenTotStop;
                          return (
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <div style={{ fontSize: 12, color: C.muted }}>Op vrije leeftijd ({stopLft} jaar):</div>
                              <div style={{ display: "flex", gap: 14 }}>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: cat?.kleur || C.gold, fontWeight: 600 }}>{eur(waardeBij)}</div>
                                  <div style={{ fontSize: 10, color: C.muted }}>waarvan {eur(Math.max(0,groei))} rente/groei</div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totaal + cashbuffer */}
              {accounts.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: C.greenPale, borderRadius: 12, border: `1px solid ${C.greenLight}40` }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 600, color: C.text }}>Totaal vermogen</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Maandelijkse inleg: {eur(totaalInleg)}/mnd</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, color: C.greenLight, fontWeight: 600 }}>{eur(totaalVerm)}</div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <BarVoortgang value={Math.min(accounts.find(a=>a.catId==="sparen")?.waarde||0, cashNodig)} max={cashNodig} color={C.gold}
                      label={`Noodfonds — aanbevolen: 6 maanden uitgaven (${eur(cashNodig)})`}
                      sub={`Dit is een vangnet voor onverwachte kosten. Reken op minimaal 3–6 maanden van je vaste lasten.`} />
                  </div>
                </div>
              )}
            </Card>

            {/* Prognose grafiek */}
            {accounts.length > 0 && grafData.length > 0 && (
              <Card>
                <Kop size={18} sub="Zo groeit jouw geld — drie scenario's tegelijk zichtbaar">Vermogensgroei over de tijd</Kop>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
                  Het <span style={{ color: C.gold, fontWeight: 600 }}>middelste scenario</span> is het meest waarschijnlijk. <span style={{ color: C.greenLight, fontWeight: 600 }}>Optimistisch</span> = 40% beter rendement, <span style={{ color: C.red, fontWeight: 600 }}>pessimistisch</span> = 40% minder. Dit laat zien hoe groot de onzekerheid is.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 4, flexWrap: "wrap" }}>
                  {[
                    { lbl: "😟 Pessimistisch", val: eur(vermOpStopP), clr: C.red },
                    { lbl: "📊 Waarschijnlijk", val: eur(vermOpStopM), clr: C.gold },
                    { lbl: "🚀 Optimistisch",  val: eur(vermOpStopO), clr: C.greenLight },
                  ].map((s,i) => (
                    <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: s.clr, fontWeight: 600, marginBottom: 3 }}>{s.lbl}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: s.clr, fontWeight: 600 }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>op {stopLft} jaar</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 280, marginTop: 8 }}>
                  <ResponsiveContainer>
                    <AreaChart data={grafData}>
                      <defs>
                        <linearGradient id="gOpt"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.2}/><stop offset="95%" stopColor={C.greenLight} stopOpacity={0}/></linearGradient>
                        <linearGradient id="gMid"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold}       stopOpacity={0.2}/><stop offset="95%" stopColor={C.gold}       stopOpacity={0}/></linearGradient>
                        <linearGradient id="gPess"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}        stopOpacity={0.15}/><stop offset="95%" stopColor={C.red}       stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `€${(v/1000000).toFixed(1)}M` : `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ScenTip />} />
                      <ReferenceLine y={benodigdPot} stroke={C.gold} strokeDasharray="6 3" label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                      <Area type="monotone" dataKey="opt"     name="🚀 Optimistisch"  stroke={C.greenLight} fill="url(#gOpt)"  strokeWidth={2}   dot={false} />
                      <Area type="monotone" dataKey="vermogen" name="📊 Waarschijnlijk" stroke={C.gold}       fill="url(#gMid)"  strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="pess"    name="😟 Pessimistisch" stroke={C.red}        fill="url(#gPess)" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStap(1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(3)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Pensioen & AOW</button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            STAP 4 — PENSIOEN
        ════════════════════════════════════════ */}
        {stap === 3 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Pensioen is geld dat je later krijgt. We leggen stap voor stap uit wat voor jou van toepassing is.">Pensioen & AOW</Kop>

            {/* Uitleg pensioen simpel */}
            <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 10, color: C.text }}>📚 Hoe werkt pensioen?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🏛️", titel: "AOW", sub: "Van de overheid", tekst: `Iedereen in Nederland krijgt automatisch AOW vanaf ${aow.leeftijd} jaar. Je hoeft hier niets voor te doen.`, kleur: C.greenLight },
                  { icon: "🏢", titel: "Werkgeverspensioen", sub: "Via je baas", tekst: "Als je in loondienst werkt bouwt je werkgever pensioen voor je op. Je krijgt dit vanaf je pensioendatum (vaak 68 jaar).", kleur: C.gold },
                  { icon: "🔒", titel: "Eigen pensioen", sub: "Zelf geregeld", tekst: "Extra pensioen dat je zelf hebt opgebouwd via banksparen of lijfrente. Belastingvoordeel tijdens opbouw.", kleur: "#7a5a8a" },
                ].map((blok, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 10, padding: "14px 14px", border: `1px solid ${blok.kleur}30` }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{blok.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{blok.titel}</div>
                    <div style={{ fontSize: 11, color: blok.kleur, fontWeight: 600, marginBottom: 6 }}>{blok.sub}</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{blok.tekst}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AOW blok */}
            <div style={{ marginTop: 16, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Jouw AOW — automatisch vanaf {aow.leeftijd} jaar</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>⚠️ {aow.disclaimer}</div>}
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{profiel.partner ? "Samenwonend tarief — jij en je partner ontvangen elk dit bedrag" : "Alleenstaand tarief"}</div>
                  {aowGat && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: C.red }}>Je stopt {jarenGat} jaar vóór je AOW — dit gat moet je overbruggen met je eigen spaargeld.</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  {profiel.partner && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>per persoon</div>}
                  <span style={{ fontSize: 10, background: aow.zeker ? `${C.greenLight}20` : `${C.gold}20`, color: aow.zeker ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase", display: "inline-block", marginTop: 4 }}>{aow.zeker ? "Officieel ✓" : "Schatting"}</span>
                </div>
              </div>
            </div>

            {/* Werkgeverspensioen */}
            <div style={{ marginTop: 16 }}>
              <CheckBox checked={pens.heeftWerkgever} onChange={v => setPn("heeftWerkgever", v)}
                label="Ik heb pensioen via mijn werkgever"
                sub="In loondienst? Dan bouwt je werkgever waarschijnlijk pensioen voor je op." />
              {pens.heeftWerkgever && (
                <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
                    Kijk op <strong>mijnpensioenoverzicht.nl</strong> voor jouw exacte bedragen. Zoek naar "verwacht pensioen op pensioendatum".
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <Lbl info="Maandelijks bedrag dat je later ontvangt. Staat op je pensioenoverzicht.">Verwacht pensioen</Lbl>
                      <NumInp value={pens.werkgever} onChange={v => setPn("werkgever", v)} prefix="€" suffix="/mnd" placeholder="0" />
                    </div>
                    <div>
                      <Lbl info="Vanaf welke leeftijd ontvang je dit pensioen? Staat ook op je pensioenoverzicht. Vaak 67 of 68 jaar.">Beschikbaar vanaf</Lbl>
                      <NumInp value={pens.werkgeverLeeftijd} onChange={v => setPn("werkgeverLeeftijd", v)} suffix="jaar" placeholder="68" />
                    </div>
                  </div>
                  {pens.werkgeverLeeftijd > stopLft && (
                    <InfoBox type="let_op" style={{ marginTop: 10 }}>Dit pensioen is pas beschikbaar op {pens.werkgeverLeeftijd} jaar — je stopt op {stopLft}. Je overbrugt {pens.werkgeverLeeftijd - stopLft} jaar zonder dit inkomen.</InfoBox>
                  )}
                </div>
              )}
            </div>

            {/* Eigen pensioen */}
            <div style={{ marginTop: 12 }}>
              <CheckBox checked={pens.heeftEigen} onChange={v => setPn("heeftEigen", v)}
                label="Ik heb zelf extra pensioen opgebouwd"
                sub="Eigen spaarrekening voor later, lijfrente of bankspaarproduct." />
              {pens.heeftEigen && (
                <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <Lbl info="Maandelijks bedrag dat je later ontvangt uit je eigen pensioenrekening.">Verwacht bedrag</Lbl>
                      <NumInp value={pens.eigen} onChange={v => setPn("eigen", v)} prefix="€" suffix="/mnd" placeholder="0" />
                    </div>
                    <div>
                      <Lbl info="Vanaf welke leeftijd is dit geld beschikbaar?">Beschikbaar vanaf</Lbl>
                      <NumInp value={pens.eigenLeeftijd} onChange={v => setPn("eigenLeeftijd", v)} suffix="jaar" placeholder="68" />
                    </div>
                  </div>
                  {pens.eigenLeeftijd > stopLft && (
                    <InfoBox type="let_op" style={{ marginTop: 10 }}>Dit geld is pas beschikbaar op {pens.eigenLeeftijd} jaar. De periode daarvoor moet je overbruggen met je eigen vermogen.</InfoBox>
                  )}
                </div>
              )}
            </div>

            {/* Jaarruimte */}
            <div style={{ marginTop: 16 }}>
              <Card style={{ background: C.greenPale, border: `1px solid ${C.greenLight}40` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>💡 Jaarruimte — belastingvrij extra sparen voor later</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
                  De overheid staat je toe om een bepaald bedrag per jaar belastingvrij in een pensioenproduct te stoppen. Je betaalt nu minder belasting en later bij het opnemen. Dit heet jaarruimte.
                  {profiel.werkType === "loondienst" ? " In loondienst is je ruimte afhankelijk van wat je werkgever al voor je opbouwt (factor A)." : " Als zelfstandige mag je 30% van je winst hiervoor gebruiken."}
                </p>
                {profiel.werkType === "loondienst" && (
                  <div style={{ marginBottom: 14 }}>
                    <Lbl info="Factor A staat op je UPO (Uniform Pensioenoverzicht) — het jaarlijkse overzicht dat je werkgever stuurt. Het is de pensioenopbouw in euro's van dit jaar. Heb je geen UPO? Vul 0 in.">Factor A (staat op je UPO van je werkgever)</Lbl>
                    <NumInp value={pens.factorA} onChange={v => setPn("factorA", v)} prefix="€" suffix="/jaar" placeholder="0" />
                  </div>
                )}
                <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Jouw ruimte om belastingvrij te sparen voor later</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: C.greenLight, fontWeight: 700 }}>{eur(jaarruimteCalc)}/jaar</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Lbl info="Hoeveel zet je dit jaar daadwerkelijk in een lijfrente of bankspaarrekening?">Hoe veel gebruik je hier al van?</Lbl>
                  <NumInp value={pens.jaarruimteInleg} onChange={v => setPn("jaarruimteInleg", v)} prefix="€" suffix="/jaar" placeholder="0" />
                </div>
                {pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && (
                  <InfoBox type="goed" style={{ marginTop: 10 }}>Je laat <strong>{eur(jaarruimteCalc - pens.jaarruimteInleg)}/jaar</strong> liggen. Dit is geld dat je belastingvrij kunt inleggen voor later.</InfoBox>
                )}
              </Card>
            </div>

            {aowGat && <div style={{ marginTop: 10 }}><InfoBox type="let_op">Je stopt {jarenGat} jaar vóór je AOW. Je hebt een overbrugging nodig van {eur(maandOpStop * 12 * jarenGat)} in totaal — houd hier rekening mee in je spaargeld.</InfoBox></div>}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStap(2)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(4)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Bekijk mijn vrijheidsplan →</button>
            </div>
          </Card>
        )}

        {/* ════════════════════════════════════════
            STAP 5 — PROGNOSE
        ════════════════════════════════════════ */}
        {stap === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <Card accent={doelBereikt ? C.greenLight : C.gold} style={{ background: doelBereikt ? C.greenPale : C.goldPale }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <Kop size={28}>{profiel.naam ? `${profiel.naam}, ` : ""}{doelBereikt ? "jouw vrijheid is haalbaar 🎉" : "bijna — een kleine aanpassing maakt het verschil ✦"}</Kop>
                  <p style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 500 }}>
                    Op {stopLft} jaar heb je naar verwachting <strong>{eur(vermOpStopM)}</strong>. Je hebt <strong>{eur(benodigdPot)}</strong> nodig om daarna van te leven zonder te werken.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 40, fontWeight: 500, color: doelBereikt ? C.greenLight : C.gold, lineHeight: 1 }}>{doelBereikt ? "+" : "-"}{eur(Math.abs(verschil))}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{doelBereikt ? "overschot" : "tekort"}</div>
                </div>
              </div>
            </Card>

            {/* Metrics simpele taal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <Metric label="Bedrag dat je nodig hebt" value={eur(benodigdPot)} accent={C.gold} sub="Om de rest van je leven van te leven" />
              <Metric label="Wat je opbouwt" value={eur(vermOpStopM)} accent={doelBereikt ? C.greenLight : C.red} sub={`Meest waarschijnlijke scenario`} />
              <Metric label="Jouw maandbudget" value={`${eur(maandOpStop)}/mnd`} accent={C.gold} sub={hypotheekVrij ? "Hypotheekvrij ✓" : "Op vrije leeftijd"} />
            </div>

            {/* Maandelijks inkomen breakdown */}
            <Card>
              <Kop size={18} sub="Waar komt jouw inkomen straks vandaan?">Jouw maandelijks inkomen op vrije leeftijd</Kop>
              <div style={{ marginTop: 16 }}>
                {[
                  { lbl: "Uit je opgebouwde vermogen", val: inkomenUitPot, sub: `${(FIRE_PCT*100).toFixed(1)}% van ${eur(vermOpStopM)} per jaar`, clr: C.greenLight, show: vermOpStopM > 0 },
                  { lbl: `AOW (${aowGat ? `pas vanaf ${aow.leeftijd} jaar` : `vanaf ${aow.leeftijd} jaar`})`, val: aowBij, sub: profiel.partner ? "Samenwonend tarief" : "Alleenstaand tarief", clr: C.gold, show: true },
                  { lbl: `Werkgeverspensioen (${pens.heeftWerkgever ? `vanaf ${pens.werkgeverLeeftijd} jaar` : "niet ingevuld"})`, val: pensBij, sub: "Via je werkgever", clr: "#7a5a8a", show: pens.heeftWerkgever },
                  { lbl: `Eigen pensioen (${pens.heeftEigen ? `vanaf ${pens.eigenLeeftijd} jaar` : "niet ingevuld"})`, val: eigenPensBij, sub: "Zelf opgebouwd", clr: "#4a90d9", show: pens.heeftEigen },
                ].filter(r => r.show && r.val > 0).map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{r.lbl}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.sub}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: r.clr, fontWeight: 600, whiteSpace: "nowrap" }}>{eur(r.val)}/mnd</div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Totaal maandinkomen</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, color: totaalMaandInkomen >= maandOpStop ? C.greenLight : C.red, fontWeight: 700 }}>{eur(totaalMaandInkomen)}/mnd</div>
                </div>
                {totaalMaandInkomen >= maandOpStop
                  ? <InfoBox type="goed" style={{ marginTop: 10 }}>Je maandinkomen ({eur(totaalMaandInkomen)}) is hoger dan je maandbudget ({eur(maandOpStop)}). Je hebt {eur(totaalMaandInkomen - maandOpStop)}/mnd over.</InfoBox>
                  : <InfoBox type="let_op" style={{ marginTop: 10 }}>Je maandinkomen ({eur(totaalMaandInkomen)}) dekt niet je volledige budget ({eur(maandOpStop)}). Verschil: {eur(maandOpStop - totaalMaandInkomen)}/mnd.</InfoBox>}
              </div>
            </Card>

            {/* Drie-scenario grafiek */}
            {grafData.length > 0 && (
              <Card>
                <Kop size={18} sub="Hoe je vermogen groeit richting jouw vrije leeftijd — in drie scenario's">Vermogensgroei</Kop>
                <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  {[
                    { lbl: "😟 Pessimistisch", val: eur(vermOpStopP), clr: C.red, ok: pessOk },
                    { lbl: "📊 Waarschijnlijk", val: eur(vermOpStopM), clr: C.gold, ok: doelBereikt },
                    { lbl: "🚀 Optimistisch",  val: eur(vermOpStopO), clr: C.greenLight, ok: true },
                  ].map((s,i) => (
                    <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, color: s.clr, fontWeight: 600, marginBottom: 3 }}>{s.lbl}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: s.clr, fontWeight: 600 }}>{s.val}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.ok ? "✓ doel bereikt" : "✗ tekort"}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 300, marginTop: 8 }}>
                  <ResponsiveContainer>
                    <AreaChart data={grafData}>
                      <defs>
                        <linearGradient id="vgOpt"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.2}/><stop offset="95%" stopColor={C.greenLight} stopOpacity={0}/></linearGradient>
                        <linearGradient id="vgMid"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold}       stopOpacity={0.2}/><stop offset="95%" stopColor={C.gold}       stopOpacity={0}/></linearGradient>
                        <linearGradient id="vgPess" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}        stopOpacity={0.15}/><stop offset="95%" stopColor={C.red}       stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `€${(v/1000000).toFixed(1)}M` : `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ScenTip />} />
                      <ReferenceLine y={benodigdPot} stroke={C.gold} strokeDasharray="6 3" label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                      <Area type="monotone" dataKey="opt"      name="🚀 Optimistisch"  stroke={C.greenLight} fill="url(#vgOpt)"  strokeWidth={2}   dot={false} />
                      <Area type="monotone" dataKey="vermogen" name="📊 Waarschijnlijk" stroke={C.gold}       fill="url(#vgMid)"  strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="pess"     name="😟 Pessimistisch" stroke={C.red}        fill="url(#vgPess)" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Hypotheek aflossing */}
            {aflossingsData.length > 0 && (
              <Card>
                <Kop size={18} sub="Hoe je hypotheekschuld daalt per jaar">Hypotheekaflossing</Kop>
                <div style={{ height: 200, marginTop: 16 }}>
                  <ResponsiveContainer>
                    <AreaChart data={aflossingsData.map(d => ({ ...d, label: `${d.leeftijd}j` }))}>
                      <defs><linearGradient id="gHypo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={0.25}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [eur(v), "Restschuld"]} />
                      <Area type="monotone" dataKey="restschuld" name="Restschuld" stroke={C.red} fill="url(#gHypo)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Actieplan */}
            <Card accent={C.gold}>
              <Kop size={18} sub="Concrete stappen die je nu al kunt zetten">Jouw actieplan</Kop>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  accounts.length === 0 && { icon: "💼", title: "Voeg je rekeningen toe", text: "Ga terug naar stap 3 en voeg je spaargeld en beleggingen toe voor een nauwkeurige prognose." },
                  pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && { icon: "💰", title: "Benut je belastingvrije ruimte", text: `Je kunt nog ${eur(jaarruimteCalc - pens.jaarruimteInleg)}/jaar extra belastingvrij inleggen voor later.` },
                  aowGat && { icon: "⏳", title: `Zorg voor overbrugging van ${jarenGat} jaar`, text: `Je ontvangt pas AOW op ${aow.leeftijd}. Zorg dat je ${eur(maandOpStop * 12 * jarenGat)} apart hebt staan hiervoor.` },
                  !aow.zeker && { icon: "📋", title: "Houd wijzigingen in de AOW-leeftijd bij", text: "Je AOW-leeftijd is nog niet officieel. Check jaarlijks rijksoverheid.nl." },
                  hypotheekVrij && { icon: "🏠", title: "Je bent hypotheekvrij op vrije leeftijd", text: `Je betaalt geen hypotheek meer — dat scheelt ${eur(hypoMaandNu * partnerAandeel)}/mnd.` },
                  kinderenWegOpStop.length > 0 && { icon: "👶", title: "Kinderkosten vallen weg", text: `${kinderenWegOpStop.length} ${kinderenWegOpStop.length === 1 ? "kind is" : "kinderen zijn"} op je vrije leeftijd al het huis uit. Dat scheelt ${eur(kinderKostenWeg * partnerAandeel)}/mnd.` },
                  !doelBereikt && !pessOk && { icon: "📈", title: "Verhoog je maandelijkse inleg", text: `Een hogere inleg of iets langer werken maakt het verschil. Met ${eur(Math.abs(verschil / (jarenTotStop * 12) * 1.2))} extra per maand kom je er.` },
                  doelBereikt && !pessOk && { icon: "⚡", title: "Doel haalbaar, maar zorg voor een buffer", text: "In het slechtste scenario kom je tekort. Overweeg iets extra te sparen als veiligheidsnet." },
                  doelBereikt && pessOk && { icon: "✦", title: "Je bent op koers in alle scenario's", text: `Blijf consequent inleggen. Over ${jarenTotStop} jaar pluk je de vruchten.` },
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
                ⚠️ <strong>Dit is een indicatie, geen financieel advies.</strong> De berekeningen gaan uit van de door jou ingevulde bedragen, 2,5% prijsstijging per jaar en de huidige belastingregels. AOW-leeftijden en regels kunnen wijzigen. Alle gegevens blijven privé op jouw apparaat.
              </p>
            </div>
            <button onClick={() => setStap(3)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14, width: "fit-content" }}>← Aanpassen</button>
          </div>
        )}
      </div>
    </div>
  );
}

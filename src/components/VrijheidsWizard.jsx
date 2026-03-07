import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { C } from '../tokens.js';
import { INFLATIE, FIRE_PCT } from '../tokens.js';
import { eur, berekenOnderhoud, berekenAow, berekenHypoDeel, bouwPrognose, bouwPrognoseScenarios, berekenJaarruimte, AOW_ALLEENSTAAND, AOW_SAMENWONEND, DEFAULT_REND } from '../utils.js';
import { CATS, ALLE_ITEMS, VERZEKERING_OPTIES } from '../data/lifestyle.js';
import { Card, Kop, Lbl, Inp, Slider, Metric, InfoBox, BarVoortgang, StapBtn, TipTool } from './Atoms.jsx';

const STAPPEN = [
  { id: "profiel",   label: "Jouw situatie"              },
  { id: "lifestyle", label: "Gewenste levensstijl"        },
  { id: "vermogen",  label: "Huidig vermogen"             },
  { id: "pensioen",  label: "Pensioen & AOW"              },
  { id: "prognose",  label: "Jouw vrijheidsplan"          },
];

const UITWONEN_LEEFTIJD = 23;

// ─── Nummerveld dat leeg mag blijven en backspace correct werkt ───────────────
function NumInp({ value, onChange, prefix, suffix, placeholder }) {
  const [raw, setRaw] = useState(value === 0 ? "" : String(value));

  function handleChange(e) {
    const v = e.target.value;
    setRaw(v);
    const n = parseFloat(v);
    onChange(isNaN(n) ? 0 : n);
  }

  function handleBlur() {
    const n = parseFloat(raw);
    setRaw(isNaN(n) || n === 0 ? "" : String(n));
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && <span style={{ position: "absolute", left: 12, fontSize: 14, color: C.muted, pointerEvents: "none" }}>{prefix}</span>}
      <input
        type="number"
        value={raw}
        placeholder={placeholder || "0"}
        onChange={handleChange}
        onBlur={handleBlur}
        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 44 : 12, fontSize: 15, color: C.text, fontFamily: "'DM Mono',monospace", fontWeight: 500 }}
      />
      {suffix && <span style={{ position: "absolute", right: 12, fontSize: 12, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
    </div>
  );
}

// ─── Tooltip 3-scenario's ─────────────────────────────────────────────────────
function ScenTip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 20px rgba(90,60,20,0.12)" }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
          <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600 }}>{eur(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function VrijheidsWizard() {
  const [stap, setStap]           = useState(0);
  const [openGroep, setOpenGroep] = useState("Wonen");

  // ── State ──────────────────────────────────────────────────────────────────
  const [profiel, setProfiel] = useState({
    naam: "", geboortejaar: "", stopLeeftijd: 55, inkomen: "",
    partner: false, werkType: "loondienst", kinderen: [],
  });

  const defLS = Object.fromEntries(ALLE_ITEMS.map(i => [i.key, 0]));
  const [ls, setLs] = useState({ ...defLS, woningWaarde: 0, bouwjaar: 0, huurder: false, onderhoudOverride: null });

  // Verzekeringen: geselecteerde items met bedrag
  const [verzek, setVerzek] = useState([]); // [{ id, bedrag }]
  const [verzekOpen, setVerzekOpen] = useState(false);

  const [verm, setVerm] = useState({
    beleggingen: 0, sparen: 0, lijfrente: 0, overig: 0, inleg: 0,
  });

  // Rendement per categorie, 3 scenario's
  const [rend, setRend] = useState({ ...DEFAULT_REND });

  const [pens, setPens] = useState({
    werkgever: 0, eigen: 0, jaarruimteInleg: 0, factorA: 0,
  });

  const [leningen, setLeningen] = useState([]);

  // ── Afgeleide waarden ──────────────────────────────────────────────────────
  const gbjaar   = parseInt(profiel.geboortejaar) || 1985;
  const leeftijd = 2025 - gbjaar;
  const aow      = berekenAow(gbjaar);
  const stopLft  = profiel.stopLeeftijd;
  const jarenTotStop = Math.max(0, stopLft - leeftijd);
  const stopJaar     = 2025 + jarenTotStop;
  const aowGat       = stopLft < aow.leeftijd;
  const jarenGat     = aowGat ? aow.leeftijd - stopLft : 0;
  const aowMaand     = profiel.partner ? AOW_SAMENWONEND : AOW_ALLEENSTAAND;

  // Kinderen analyse
  const kinderenWegOpStop = profiel.kinderen.filter(k => {
    const lftStop = gbjaar + stopLft - k.geboortejaar;
    return lftStop >= UITWONEN_LEEFTIJD;
  });
  const kostenPerKindMnd  = profiel.kinderen.length > 0 ? (ls.kinderen / profiel.kinderen.length) : 0;
  const kinderKostenWeg   = kinderenWegOpStop.length * kostenPerKindMnd;

  // Onderhoud
  const autoOnderhoud   = (ls.woningWaarde > 0 && ls.bouwjaar > 0 && !ls.huurder)
    ? berekenOnderhoud(ls.woningWaarde, ls.bouwjaar) : 0;
  const onderhoudMaand  = ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud;

  // Hypotheek
  const leningCalc     = leningen.map(d => ({ ...d, ...berekenHypoDeel(d) }));
  const hypoMaandNu    = leningCalc.reduce((s, d) => s + d.maand, 0);
  const hypoRestschuld = leningCalc.reduce((s, d) => s + d.restschuld, 0);
  const hypoOpStop     = leningCalc.reduce((s, d) => d.eindjaar > stopJaar ? s + d.maand : s, 0);
  const hypotheekVrij  = !ls.huurder && leningen.length > 0 && hypoOpStop === 0;

  // Aflossingsschema gecombineerd voor grafiek
  const aflossingsData = (() => {
    if (leningen.length === 0) return [];
    const jaren = {};
    leningCalc.forEach(l => {
      (l.schema || []).forEach(s => {
        if (!jaren[s.jaar]) jaren[s.jaar] = 0;
        jaren[s.jaar] += s.restschuld;
      });
    });
    return Object.entries(jaren)
      .map(([jaar, restschuld]) => ({ jaar: parseInt(jaar), leeftijd: parseInt(jaar) - 2025 + leeftijd, restschuld }))
      .sort((a, b) => a.jaar - b.jaar);
  })();

  // Verzekeringen totaal
  const verzekMaand = verzek.reduce((s, v) => s + (v.bedrag || 0), 0);

  // Effectieve levensstijl
  const effLs = { ...ls, onderhoud: onderhoudMaand, huurHypo: !ls.huurder && hypoMaandNu > 0 ? hypoMaandNu : ls.huurHypo };
  const maandNu = ALLE_ITEMS.reduce((s, item) => {
    if (item.key === "onderhoud") return s + onderhoudMaand;
    const v = effLs[item.key] || 0;
    return s + (item.div ? v / item.div : v);
  }, 0) + verzekMaand;

  let maandOpStop = maandNu;
  if (!ls.huurder && hypoMaandNu > 0) maandOpStop = maandOpStop - hypoMaandNu + hypoOpStop;
  maandOpStop = Math.max(0, maandOpStop - kinderKostenWeg);

  const jaarOpStop   = maandOpStop * 12 * Math.pow(1 + INFLATIE, jarenTotStop);
  const cashNodig    = maandNu * 6;
  const heeftBuffer  = verm.sparen >= cashNodig;
  const jaarruimteCalc = berekenJaarruimte(parseFloat(profiel.inkomen) || 0, profiel.werkType, pens.factorA);

  const aowBij  = aowGat ? 0 : aowMaand;
  const pensBij = aowGat ? 0 : pens.werkgever + pens.eigen;
  const benodigdKap = Math.max(0, jaarOpStop - (aowBij + pensBij) * 12) / FIRE_PCT;

  const totaalVerm = verm.beleggingen + verm.sparen + verm.lijfrente + verm.overig;
  const vermCats   = { beleggingen: verm.beleggingen, sparen: verm.sparen, lijfrente: verm.lijfrente, overig: verm.overig };

  const scenarios  = bouwPrognoseScenarios(leeftijd, stopLft, vermCats, rend, verm.inleg, benodigdKap);
  const grafData   = scenarios.midden.map((d, i) => ({
    ...d,
    pess: scenarios.pess[i]?.vermogen,
    opt:  scenarios.opt[i]?.vermogen,
  }));

  const vermOpStopMidden = scenarios.midden.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const vermOpStopPess   = scenarios.pess.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const vermOpStopOpt    = scenarios.opt.find(d => d.leeftijd === stopLft)?.vermogen || 0;
  const verschilMidden   = vermOpStopMidden - benodigdKap;
  const doelBereikt      = verschilMidden >= 0;
  const doelBereiktPess  = vermOpStopPess >= benodigdKap;

  const missend = ALLE_ITEMS.filter(item => {
    const v = effLs[item.key] || 0;
    const b = item.div ? item.bench / item.div : item.bench;
    return b > 50 && v === 0 && !["kinderen","huisdier","onderhoud","huurHypo"].includes(item.key);
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setL  = (k, v) => setLs(p => ({ ...p, [k]: v }));
  const setP  = (k, v) => setProfiel(p => ({ ...p, [k]: v }));
  const setV  = (k, v) => setVerm(p => ({ ...p, [k]: v }));
  const setPn = (k, v) => setPens(p => ({ ...p, [k]: v }));
  const setRk = (cat, sc, val) => setRend(p => ({ ...p, [cat]: { ...p[cat], [sc]: parseFloat(val) / 100 } }));

  function addKind() { setP("kinderen", [...profiel.kinderen, { id: Date.now(), geboortejaar: 2015 }]); }
  function delKind(id) { setP("kinderen", profiel.kinderen.filter(k => k.id !== id)); }
  function updKind(id, gb) { setP("kinderen", profiel.kinderen.map(k => k.id === id ? { ...k, geboortejaar: gb } : k)); }

  function addLening() {
    setLeningen(p => [...p, { id: Date.now(), label: `Leningdeel ${String.fromCharCode(65 + p.length)}`, hoofdsom: 0, rente: 0, looptijdJaar: 30, startjaar: 2020, soort: "annuiteit" }]);
  }
  const delLening = id => setLeningen(p => p.filter(d => d.id !== id));
  const updLening = (id, k, v) => setLeningen(p => p.map(d => d.id === id ? { ...d, [k]: v } : d));

  function toggleVerzek(id) {
    if (verzek.find(v => v.id === id)) {
      setVerzek(p => p.filter(v => v.id !== id));
    } else {
      const opt = VERZEKERING_OPTIES.find(o => o.id === id);
      setVerzek(p => [...p, { id, bedrag: opt?.bench || 0 }]);
    }
  }
  function updVerzekBedrag(id, bedrag) {
    setVerzek(p => p.map(v => v.id === id ? { ...v, bedrag } : v));
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28 }}>

      {/* Sidebar */}
      <div>
        <Card style={{ position: "sticky", top: 80 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, color: C.muted, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.08em" }}>Jouw plan</div>
          {STAPPEN.map((s, i) => (
            <StapBtn key={s.id} nr={i + 1} active={stap === i} done={stap > i} label={s.label} onClick={() => setStap(i)} />
          ))}
          {stap === 4 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: doelBereikt ? C.greenPale : C.redPale, borderRadius: 10, border: `1px solid ${(doelBereikt ? C.greenLight : C.red)}40` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: doelBereikt ? C.green : C.red }}>
                {doelBereikt ? "✓ Doel bereikbaar" : "⚠ Bijstelling nodig"}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                {doelBereikt ? `${eur(verschilMidden)} overschot` : `${eur(Math.abs(verschilMidden))} tekort`}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Main */}
      <div className="fu">

        {/* ══════════════════════════════════════════════════════
            STAP 1 — PROFIEL
        ══════════════════════════════════════════════════════ */}
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
                <NumInp value={profiel.geboortejaar} onChange={v => setP("geboortejaar", v)} placeholder="bv. 1985" suffix={profiel.geboortejaar ? `(${leeftijd} jaar)` : ""} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Slider label="Financiële vrije leeftijd" value={stopLft}
                  onChange={v => setP("stopLeeftijd", v)} min={leeftijd + 1} max={75}
                  fmt={v => `${v} jaar (over ${v - leeftijd} jaar)`} />
              </div>

              <div>
                <Lbl info="Bruto jaarsalaris incl. vakantiegeld. ZZP: gemiddelde jaarwinst.">Bruto jaarinkomen</Lbl>
                <NumInp value={profiel.inkomen} onChange={v => setP("inkomen", v)} prefix="€" placeholder="bv. 60000" />
              </div>

              <div>
                <Lbl info="Bepaalt hoe je jaarruimte berekend wordt. ZZP heeft geen factor A.">Werksituatie</Lbl>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["loondienst","In loondienst"],["zzp","ZZP / ondernemer"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setP("werkType", val)}
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `2px solid ${profiel.werkType === val ? C.gold : C.border}`, background: profiel.werkType === val ? C.goldPale : C.surface, color: profiel.werkType === val ? C.gold : C.muted, fontWeight: profiel.werkType === val ? 600 : 400, fontSize: 13 }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Partner */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div onClick={() => setP("partner", !profiel.partner)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: `2px solid ${profiel.partner ? C.gold : C.border}`, background: profiel.partner ? C.goldPale : C.surface, cursor: "pointer" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${profiel.partner ? C.gold : C.border}`, background: profiel.partner ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {profiel.partner && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: profiel.partner ? C.gold : C.text }}>Ik plan samen met een partner</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {profiel.partner ? `AOW: ${eur(AOW_SAMENWONEND)}/mnd per persoon (samenwonend tarief)` : `AOW: ${eur(AOW_ALLEENSTAAND)}/mnd (alleenstaand tarief)`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kinderen */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Lbl info="Kinderen die vóór je financiële vrije leeftijd het huis uit gaan zorgen voor lagere uitgaven.">Kinderen</Lbl>
                  <button onClick={addKind} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 14px", fontSize: 13, color: C.muted }}>
                    + Kind toevoegen
                  </button>
                </div>
                {profiel.kinderen.length === 0 && <div style={{ fontSize: 13, color: C.dim, fontStyle: "italic" }}>Geen kinderen ingevuld</div>}
                {profiel.kinderen.map(k => {
                  const lftNu   = 2025 - k.geboortejaar;
                  const lftStop = gbjaar + stopLft - k.geboortejaar;
                  const uitHuis = lftStop >= UITWONEN_LEEFTIJD;
                  return (
                    <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 14px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 18 }}>👶</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: C.muted }}>Geboortejaar:</span>
                          <input type="number" value={k.geboortejaar}
                            onChange={e => updKind(k.id, parseInt(e.target.value) || 2015)}
                            style={{ width: 80, background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: "4px 8px", fontSize: 13, fontFamily: "'DM Mono',monospace", color: C.text }} />
                          <span style={{ fontSize: 12, color: C.muted }}>({lftNu} jaar nu)</span>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, color: uitHuis ? C.greenLight : C.gold, fontWeight: 500 }}>
                          {uitHuis ? `✓ Op financiële vrije leeftijd al ${lftStop} jaar — kosten vallen weg` : `Op financiële vrije leeftijd ${lftStop} jaar — nog thuis`}
                        </div>
                      </div>
                      <button onClick={() => delKind(k.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>
                  );
                })}
                {kinderenWegOpStop.length > 0 && (
                  <InfoBox type="goed">{kinderenWegOpStop.length === 1 ? "1 kind is" : `${kinderenWegOpStop.length} kinderen zijn`} op je financiële vrije leeftijd al het huis uit — bespaart <strong>{eur(kinderKostenWeg)}/mnd</strong>.</InfoBox>
                )}
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
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{profiel.partner ? "samenwonend" : "alleenstaand"}</div>
                  <span style={{ fontSize: 10, background: aow.zeker ? `${C.greenLight}20` : `${C.gold}20`, color: aow.zeker ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600, textTransform: "uppercase", display: "inline-block", marginTop: 4 }}>
                    {aow.zeker ? "Officieel ✓" : "Indicatie"}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <InfoBox>Je wil financieel vrij zijn op <strong>{stopLft} jaar</strong> — over <strong>{jarenTotStop} jaar</strong>.{" "}
                {aowGat ? `AOW begint pas op ${aow.leeftijd} — een gat van ${jarenGat} jaar om zelf te overbruggen.` : `Op die datum ontvang je al ${eur(aowMaand)}/mnd AOW.`}
              </InfoBox>
            </div>
            <button onClick={() => setStap(1)} style={{ marginTop: 20, background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Volgende → Levensstijl
            </button>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════
            STAP 2 — LIFESTYLE
        ══════════════════════════════════════════════════════ */}
        {stap === 1 && (
          <div>
            <Card accent={C.gold} style={{ marginBottom: 14 }}>
              <Kop size={26} sub="Hoe wil jij leven als je financieel vrij bent? Wees eerlijk — dit is jouw droomscenario.">
                Gewenste levensstijl
              </Kop>

              {/* Woninggegevens */}
              <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, marginBottom: 14, color: C.text }}>🏠 Woninggegevens</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <Lbl>Woningwaarde (WOZ)</Lbl>
                    <NumInp value={ls.woningWaarde} onChange={v => setL("woningWaarde", v)} prefix="€" placeholder="bv. 400000" />
                  </div>
                  <div>
                    <Lbl info="Bouwjaar bepaalt onderhoudsnorm: voor 1985 = 1,8%/jr, 1985–2005 = 1,4%, na 2005 = 1,1% van woningwaarde.">Bouwjaar</Lbl>
                    <NumInp value={ls.bouwjaar} onChange={v => setL("bouwjaar", v)} placeholder="bv. 1995" />
                  </div>
                  <div>
                    <Lbl info="Automatisch berekend. Klik op het potlood om het bedrag handmatig aan te passen.">
                      Onderhoud/mnd
                    </Lbl>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <NumInp
                        value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud}
                        onChange={v => setL("onderhoudOverride", v)}
                        prefix="€"
                        placeholder="0"
                      />
                      {ls.onderhoudOverride !== null && (
                        <button onClick={() => setL("onderhoudOverride", null)}
                          title="Herstel automatische berekening"
                          style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.gold, whiteSpace: "nowrap" }}>
                          ↺ auto
                        </button>
                      )}
                    </div>
                    {ls.onderhoudOverride === null && autoOnderhoud > 0 && (
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Auto: {eur(autoOnderhoud)}/mnd — klik om aan te passen</div>
                    )}
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
                      {leningen.length > 0 && (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                          Totaal nu: <span style={{ fontFamily: "'DM Mono',monospace", color: C.gold, fontWeight: 600 }}>{eur(hypoMaandNu)}/mnd</span>
                          {" · "}Restschuld: <span style={{ fontFamily: "'DM Mono',monospace", color: C.red, fontWeight: 600 }}>{eur(hypoRestschuld)}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={addLening} style={{ background: C.gold, border: "none", borderRadius: 9, padding: "7px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>+ Leningdeel</button>
                  </div>

                  {leningen.length === 0 && (
                    <div style={{ padding: "20px 18px", color: C.dim, fontSize: 13, fontStyle: "italic" }}>Nog geen leningdelen toegevoegd.</div>
                  )}

                  {leningen.map((deel, idx) => {
                    const c = leningCalc.find(b => b.id === deel.id) || {};
                    const aflVoorStop = c.eindjaar && c.eindjaar <= stopJaar;
                    const restLooptijd = c.restLooptijdJaar || 0;
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
                          {leningen.length > 0 && (
                            <button onClick={() => delLening(deel.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                          )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                          <div>
                            <Lbl>Hoofdsom</Lbl>
                            <NumInp value={deel.hoofdsom} onChange={v => updLening(deel.id, "hoofdsom", v)} prefix="€" placeholder="0" />
                          </div>
                          <div>
                            <Lbl>Rente</Lbl>
                            <NumInp value={deel.rente} onChange={v => updLening(deel.id, "rente", v)} suffix="%" placeholder="0" />
                          </div>
                          <div>
                            <Lbl info="Totale looptijd van de lening in jaren. Resterende looptijd wordt automatisch berekend.">Looptijd</Lbl>
                            <NumInp value={deel.looptijdJaar} onChange={v => updLening(deel.id, "looptijdJaar", v)} suffix="jaar" placeholder="30" />
                          </div>
                          <div>
                            <Lbl info="Jaar waarin de hypotheek is afgesloten. Hieruit berekenen we de resterende looptijd.">Startjaar</Lbl>
                            <NumInp value={deel.startjaar} onChange={v => updLening(deel.id, "startjaar", v)} placeholder="2020" />
                          </div>
                          <div>
                            <Lbl info="Annuiteit: vaste maandlast. Lineair: vaste aflossing, dalende maandlast. Aflossingsvrij: alleen rente.">Soort</Lbl>
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
                            { lbl: "Maandlast nu",         val: `${eur(c.maand || 0)}/mnd`,   clr: C.gold        },
                            { lbl: "Restschuld",           val: eur(c.restschuld || 0),        clr: C.red         },
                            { lbl: "Resterende looptijd",  val: `${restLooptijd} jaar`,        clr: C.muted       },
                            { lbl: `Op ${stopLft}j`,       val: aflVoorStop ? "Afgelost ✓" : `${eur(c.maand || 0)}/mnd`, clr: aflVoorStop ? C.greenLight : C.text },
                          ].map((k, i) => (
                            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px" }}>
                              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{k.lbl}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: k.clr, fontWeight: 600 }}>{k.val}</div>
                            </div>
                          ))}
                        </div>
                        {deel.soort === "aflossingsvrij" && (
                          <div style={{ marginTop: 10, fontSize: 12, color: C.gold, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                            ⚠ Aflossingsvrij: op einddatum ({c.eindjaar || "?"}) is {eur(deel.hoofdsom)} ineens opeisbaar.
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {leningen.length > 0 && (
                    <div style={{ padding: "14px 18px", background: hypotheekVrij ? C.greenPale : C.goldPale, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Op financiële vrije leeftijd ({stopLft} jaar)</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                            {hypotheekVrij ? "✓ Alle leningdelen afgelost — hypotheekvrij!" : `Resterende maandlast: ${eur(hypoOpStop)}/mnd`}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 600, color: hypotheekVrij ? C.greenLight : C.gold }}>
                          {hypotheekVrij ? "Hypotheekvrij ✓" : `${eur(hypoOpStop)}/mnd`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Verzekeringen blok */}
            <Card style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setVerzekOpen(!verzekOpen)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7a5a8a", flexShrink: 0 }} />
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>🛡️ Verzekeringen</span>
                  {verzek.length > 0 && <span style={{ fontSize: 11, background: `${C.gold}20`, color: C.gold, padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>{verzek.length} geselecteerd</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: "#7a5a8a", fontWeight: 600 }}>{eur(verzekMaand)}/mnd</span>
                  <span style={{ color: C.muted, fontSize: 16 }}>{verzekOpen ? "∧" : "∨"}</span>
                </div>
              </button>
              {verzekOpen && (
                <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 13, color: C.muted, margin: "14px 0 12px", lineHeight: 1.6 }}>
                    Selecteer de verzekeringen die je hebt (of wil houden bij financiële vrijheid). Pas het bedrag per stuk aan.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {VERZEKERING_OPTIES.map(opt => {
                      const sel = verzek.find(v => v.id === opt.id);
                      return (
                        <div key={opt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: sel ? C.goldPale : C.surface, borderRadius: 10, border: `1px solid ${sel ? C.gold + "60" : C.border}` }}>
                          <div onClick={() => toggleVerzek(opt.id)}
                            style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${sel ? C.gold : C.border}`, background: sel ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            {sel && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleVerzek(opt.id)}>
                            <div style={{ fontSize: 13, color: C.text, fontWeight: sel ? 600 : 400 }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.info}</div>
                          </div>
                          {sel && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              <NumInp value={sel.bedrag} onChange={v => updVerzekBedrag(opt.id, v)} suffix="/mnd" placeholder="0" />
                            </div>
                          )}
                          {!sel && (
                            <div style={{ fontSize: 11, color: C.dim, flexShrink: 0 }}>gem. {eur(opt.bench)}/mnd</div>
                          )}
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
              const totaal = groep.items.reduce((s, item) => {
                if (item.key === "onderhoud") return s + onderhoudMaand;
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
                          const v   = item.key === "onderhoud" ? onderhoudMaand : (effLs[item.key] || 0);
                          const bM  = item.div ? item.bench / item.div : item.bench;
                          const vM  = item.div ? v / item.div : v;
                          const low = bM > 50 && vM > 0 && vM < bM * 0.5;
                          return (
                            <div key={item.key}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{item.label}</span>
                                {item.info && (
                                  <span title={item.info} style={{ width: 16, height: 16, borderRadius: "50%", background: C.goldPale, border: `1px solid ${C.gold}50`, fontSize: 10, color: C.gold, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0, fontWeight: 700 }}>?</span>
                                )}
                              </div>
                              {item.key === "onderhoud" ? (
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <NumInp value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud} onChange={v => setL("onderhoudOverride", v)} prefix="€" suffix="/mnd" placeholder="0" />
                                  {ls.onderhoudOverride !== null && (
                                    <button onClick={() => setL("onderhoudOverride", null)} style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 8px", fontSize: 10, color: C.gold }}>↺</button>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <NumInp value={v} onChange={val => setL(item.key, val)} suffix={item.suffix} placeholder="0" />
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
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>jouw vrijheidsgetal op financiële vrije leeftijd</div>
                  {hypotheekVrij && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 3 }}>✓ Hypotheekvrij</div>}
                  {kinderenWegOpStop.length > 0 && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 2 }}>✓ {kinderenWegOpStop.length === 1 ? "1 kind" : `${kinderenWegOpStop.length} kinderen`} uit huis ({eur(kinderKostenWeg)}/mnd minder)</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, color: C.gold, fontWeight: 500 }}>{eur(maandOpStop)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>/mnd op vrije leeftijd · nu {eur(maandNu)}</div>
                </div>
              </div>
              {missend.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <InfoBox type="let_op"><strong>{missend.length} categorieën staan op €0:</strong> {missend.map(m => m.label).join(", ")}. Controleer of dit klopt.</InfoBox>
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

        {/* ══════════════════════════════════════════════════════
            STAP 3 — VERMOGEN
        ══════════════════════════════════════════════════════ */}
        {stap === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    <NumInp value={verm[f.k]} onChange={v => setV(f.k, v)} prefix="€" placeholder="0" />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 6 }}>
                  <Lbl info="Hoeveel je elke maand extra inlegt / belegt bovenop wat je al hebt.">Maandelijkse inleg</Lbl>
                  <NumInp value={verm.inleg} onChange={v => setV("inleg", v)} prefix="€" suffix="/mnd" placeholder="0" />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <BarVoortgang value={Math.min(verm.sparen, cashNodig)} max={cashNodig} color={heeftBuffer ? C.greenLight : C.gold}
                  label="Cashbuffer — aanbevolen 6 maanden uitgaven"
                  sub={`${eur(cashNodig)} nodig · ${heeftBuffer ? "✓ Voldoende" : `Tekort: ${eur(cashNodig - verm.sparen)}`}`} />
                <div style={{ marginTop: 10 }}>
                  {heeftBuffer
                    ? <InfoBox type="goed">Gezonde cashbuffer. Alles boven {eur(cashNodig)} kan actief belegd worden.</InfoBox>
                    : <InfoBox>Bouw eerst een buffer van 6 maanden ({eur(cashNodig)}) op voordat je agressiever belegt.</InfoBox>}
                </div>
              </div>
            </Card>

            {/* Rendement per categorie */}
            <Card accent={C.greenLight}>
              <Kop size={18} sub="Stel het verwachte rendement in per categorie voor elk scenario">Rendement per categorie</Kop>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Categorie</div>
                  {[["pess","😟 Pessimistisch"],["midden","📊 Waarschijnlijk"],["opt","🚀 Optimistisch"]].map(([k,lbl]) => (
                    <div key={k} style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{lbl}</div>
                  ))}
                </div>
                {[
                  { k: "beleggingen", lbl: "Beleggingen", icon: "📈" },
                  { k: "sparen",      lbl: "Sparen",      icon: "🏦" },
                  { k: "lijfrente",   lbl: "Lijfrente",   icon: "🔒" },
                  { k: "overig",      lbl: "Overig",      icon: "💼" },
                ].map(cat => (
                  <div key={cat.k} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 14, color: C.text }}>{cat.icon} {cat.lbl}</div>
                    {["pess","midden","opt"].map(sc => (
                      <div key={sc} style={{ position: "relative" }}>
                        <input type="number" step="0.1" min="0" max="20"
                          value={(rend[cat.k][sc] * 100).toFixed(1)}
                          onChange={e => setRk(cat.k, sc, e.target.value)}
                          style={{ width: "100%", background: sc === "pess" ? "#fdf0ee" : sc === "opt" ? C.greenPale : C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 28px 8px 10px", fontSize: 13, fontFamily: "'DM Mono',monospace", color: C.text, textAlign: "right" }} />
                        <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, pointerEvents: "none" }}>%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStap(1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(3)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Volgende → Pensioen & AOW</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STAP 4 — PENSIOEN
        ══════════════════════════════════════════════════════ */}
        {stap === 3 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Pensioen is vermogen dat je later ontgrendelt. We rekenen alles mee.">Pensioen & AOW</Kop>
            <div style={{ marginTop: 20, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40`, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>AOW-leeftijd: {aow.leeftijd} jaar — {aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>{aow.disclaimer}</div>}
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{profiel.partner ? "Samenwonend tarief — jij én je partner ontvangen elk dit bedrag" : "Alleenstaand tarief"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  {profiel.partner && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>per persoon</div>}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <Lbl info="Verwacht pensioen via je werkgever op pensioenleeftijd. Zie mijnpensioenoverzicht.nl.">Werkgeverspensioen</Lbl>
                <NumInp value={pens.werkgever} onChange={v => setPn("werkgever", v)} prefix="€" suffix="/mnd" placeholder="0" />
              </div>
              <div>
                <Lbl info="Pensioen uit eigen bankspaarrekening of lijfrente.">Eigen pensioen / lijfrente</Lbl>
                <NumInp value={pens.eigen} onChange={v => setPn("eigen", v)} prefix="€" suffix="/mnd" placeholder="0" />
              </div>
              <div>
                <Lbl info="Hoeveel je dit jaar inlegt in een lijfrente of bankspaarproduct.">Jaarlijkse lijfrente-inleg nu</Lbl>
                <NumInp value={pens.jaarruimteInleg} onChange={v => setPn("jaarruimteInleg", v)} prefix="€" suffix="/jaar" placeholder="0" />
              </div>
              {profiel.werkType === "loondienst" && (
                <div>
                  <Lbl info="Factor A staat op je UPO (Uniform Pensioenoverzicht). Jaarlijkse pensioenopbouw in euro's. Vermenigvuldigd met 6,27 verlaagt het je jaarruimte.">Factor A (UPO)</Lbl>
                  <NumInp value={pens.factorA} onChange={v => setPn("factorA", v)} prefix="€" suffix="/jaar" placeholder="0" />
                </div>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <Card style={{ background: C.greenPale, border: `1px solid ${C.greenLight}40` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
                  Jaarruimte 2025 — {profiel.werkType === "zzp" ? "ZZP" : "Loondienst"}
                </div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
                  {profiel.werkType === "zzp"
                    ? "Als ZZP'er mag je 30% van je premiegrondslag inleggen (max €34.550/jr). Geen factor A."
                    : "In loondienst is je ruimte 13,3% van je premiegrondslag min 6,27 × factor A. Haal je factor A op uit je UPO."}
                </p>
                <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Jouw geschatte jaarruimte</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: C.greenLight, fontWeight: 700 }}>{eur(jaarruimteCalc)}/jaar</span>
                </div>
                {profiel.werkType === "loondienst" && pens.factorA > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Correctie factor A: {eur(pens.factorA)} × 6,27 = {eur(pens.factorA * 6.27)} minder ruimte</div>
                )}
                {pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <InfoBox type="goed">Je benut {eur(pens.jaarruimteInleg)} van {eur(jaarruimteCalc)}. <strong>{eur(jaarruimteCalc - pens.jaarruimteInleg)} extra</strong> mag belastingvrij ingelegd.</InfoBox>
                  </div>
                )}
              </Card>
              {aowGat && <div style={{ marginTop: 10 }}><InfoBox type="let_op">AOW-gat: {jarenGat} jaar. Zorg voor minimaal {eur(aowMaand * 12 * jarenGat)} liquide om te overbruggen tot je {aow.leeftijd}e.</InfoBox></div>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStap(2)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(4)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Bekijk mijn vrijheidsplan →</button>
            </div>
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════
            STAP 5 — PROGNOSE
        ══════════════════════════════════════════════════════ */}
        {stap === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <Card accent={doelBereikt ? C.greenLight : C.gold} style={{ background: doelBereikt ? C.greenPale : C.goldPale }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <Kop size={28}>{profiel.naam ? `${profiel.naam}, ` : ""}{doelBereikt ? "jouw vrijheid is haalbaar 🎉" : "bijna daar — kleine aanpassing nodig ✦"}</Kop>
                  <p style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6, maxWidth: 500 }}>
                    Waarschijnlijk scenario: op {stopLft} jaar heb je <strong>{eur(vermOpStopMidden)}</strong> opgebouwd. Je hebt <strong>{eur(benodigdKap)}</strong> nodig.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 42, fontWeight: 500, color: doelBereikt ? C.greenLight : C.gold, lineHeight: 1 }}>
                    {doelBereikt ? "+" : "-"}{eur(Math.abs(verschilMidden))}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{doelBereikt ? "overschot" : "tekort"} (waarschijnlijk)</div>
                </div>
              </div>
            </Card>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              <Metric label="Benodigde kapitaal" value={eur(benodigdKap)} accent={C.gold} sub="3,5% onttrekkingsregel" />
              <Metric label="Waarschijnlijk" value={eur(vermOpStopMidden)} accent={doelBereikt ? C.greenLight : C.red} sub="Middenscenario" />
              <Metric label="Vrijheidsgetal" value={`${eur(maandOpStop)}/mnd`} accent={C.gold} sub={hypotheekVrij ? "Hypotheekvrij ✓" : "Op vrije leeftijd"} />
              <Metric label="Passief inkomen" value={`${eur(aowBij + pensBij)}/mnd`} accent={C.greenLight} sub={`Vanaf ${aow.leeftijd} jaar`} />
            </div>

            {/* 3-scenario grafiek */}
            <Card>
              <Kop size={18} sub="Drie scenario's tegelijk — pessimistisch, waarschijnlijk en optimistisch">Vermogensprognose tot financiële vrije leeftijd</Kop>
              <div style={{ display: "flex", gap: 16, marginTop: 10, marginBottom: 4, flexWrap: "wrap" }}>
                {[
                  { lbl: "Pessimistisch", val: eur(vermOpStopPess), clr: C.red, bereikt: doelBereiktPess },
                  { lbl: "Waarschijnlijk", val: eur(vermOpStopMidden), clr: C.gold, bereikt: doelBereikt },
                  { lbl: "Optimistisch",  val: eur(vermOpStopOpt),  clr: C.greenLight, bereikt: true },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.surface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: s.clr, fontWeight: 600, marginBottom: 3 }}>{s.lbl}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: s.clr, fontWeight: 600 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.bereikt ? "✓ doel bereikt" : "✗ tekort"}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 300, marginTop: 8 }}>
                <ResponsiveContainer>
                  <AreaChart data={grafData}>
                    <defs>
                      <linearGradient id="gOpt"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.2} /><stop offset="95%" stopColor={C.greenLight} stopOpacity={0} /></linearGradient>
                      <linearGradient id="gMidden" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold}       stopOpacity={0.2} /><stop offset="95%" stopColor={C.gold}       stopOpacity={0} /></linearGradient>
                      <linearGradient id="gPess"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}        stopOpacity={0.15} /><stop offset="95%" stopColor={C.red}       stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false}
                      tickFormatter={v => v >= 1000000 ? `€${(v/1000000).toFixed(1)}M` : `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ScenTip />} />
                    <ReferenceLine y={benodigdKap} stroke={C.gold} strokeDasharray="6 3"
                      label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="opt"     name="Optimistisch"  stroke={C.greenLight} fill="url(#gOpt)"    strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="vermogen" name="Waarschijnlijk" stroke={C.gold}       fill="url(#gMidden)" strokeWidth={2.5} dot={false} />
                    <Area type="monotone" dataKey="pess"    name="Pessimistisch" stroke={C.red}        fill="url(#gPess)"   strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Hypotheek aflossing grafiek */}
            {aflossingsData.length > 0 && (
              <Card>
                <Kop size={18} sub="Resterende hypotheekschuld per jaar afgezet tegen jouw leeftijd">Hypotheekaflossing</Kop>
                <div style={{ height: 220, marginTop: 16 }}>
                  <ResponsiveContainer>
                    <AreaChart data={aflossingsData.map(d => ({ ...d, label: `${d.leeftijd}j (${d.jaar})` }))}>
                      <defs>
                        <linearGradient id="gHypo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.red} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={C.red} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false}
                        tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [eur(v), "Restschuld"]} />
                      <ReferenceLine x={aflossingsData.find(d => d.leeftijd === stopLft)?.label || ""} stroke={C.gold} strokeDasharray="4 2"
                        label={{ value: "Vrij", fill: C.gold, fontSize: 10 }} />
                      <Area type="monotone" dataKey="restschuld" name="Restschuld" stroke={C.red} fill="url(#gHypo)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Actieplan */}
            <Card accent={C.gold}>
              <Kop size={18} sub="Concrete stappen die je vandaag kunt zetten">Jouw actieplan</Kop>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  !heeftBuffer && { icon: "🛡", title: "Bouw eerst je cashbuffer op", text: `Je hebt nog ${eur(cashNodig - verm.sparen)} nodig voor 6 maanden buffer.` },
                  pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && { icon: "💰", title: "Benut je jaarruimte volledig", text: `Je kunt nog ${eur(jaarruimteCalc - pens.jaarruimteInleg)}/jaar extra belastingvrij inleggen.` },
                  aowGat && { icon: "⏳", title: `Plan je AOW-gat van ${jarenGat} jaar`, text: `Je hebt ${eur(aowMaand * 12 * jarenGat)} nodig om te overbruggen tot je ${aow.leeftijd}e.` },
                  !aow.zeker && { icon: "📋", title: "Houd AOW-wijzigingen bij", text: "Jouw AOW-leeftijd is nog niet officieel vastgesteld. Check jaarlijks rijksoverheid.nl." },
                  hypotheekVrij && { icon: "🏠", title: "Hypotheekvrij voordeel", text: `Je bent hypotheekvrij op je vrije leeftijd. Maandlast van ${eur(hypoMaandNu)} valt weg.` },
                  kinderenWegOpStop.length > 0 && { icon: "👶", title: "Kinderkosten vallen weg", text: `${kinderenWegOpStop.length === 1 ? "1 kind is" : `${kinderenWegOpStop.length} kinderen zijn`} op je vrije leeftijd al het huis uit. Scheelt ${eur(kinderKostenWeg)}/mnd.` },
                  leningen.some(d => d.soort === "aflossingsvrij") && { icon: "⚠️", title: "Check je aflossingsvrije hypotheek", text: "Op einddatum is de volledige hoofdsom ineens opeisbaar. Zorg voor een herfinancieringsplan." },
                  !doelBereikt && !doelBereiktPess && { icon: "📈", title: "Verhoog je maandelijkse inleg", text: `Met ${eur(Math.abs(verschilMidden / (jarenTotStop * 12) * 1.2))} extra per maand bereik je je doel op tijd.` },
                  doelBereikt && !doelBereiktPess && { icon: "⚡", title: "Doel bereikbaar, maar kwetsbaar", text: "In het pessimistische scenario haal je het net niet. Overweeg een extra buffer in te bouwen." },
                  doelBereikt && doelBereiktPess && { icon: "✦", title: "Je bent op koers in alle scenario's", text: `Zelfs pessimistisch bereik je je doel. Over ${jarenTotStop} jaar pluk je de vruchten.` },
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
                ⚠️ <strong>Indicatieve berekening</strong> — gebaseerd op de door jou ingevulde rendementen, 2,5% inflatie en huidige belastingregels. AOW-leeftijden kunnen wijzigen. Geen financieel advies. Alle data blijft lokaal in je browser.
              </p>
            </div>
            <button onClick={() => setStap(3)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14, width: "fit-content" }}>← Aanpassen</button>
          </div>
        )}
      </div>
    </div>
  );
}

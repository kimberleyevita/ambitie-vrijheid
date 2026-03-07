import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
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

// Mobiliteitskosten uitleg zichtbaar als blok
const MOBILITEIT_UITLEG = [
  { icon: "⛽", label: "Benzine / energie", sub: "Brandstof of stroom voor dagelijks gebruik" },
  { icon: "📉", label: "Afschrijving", sub: "Auto verliest elk jaar waarde (~15%/jaar)" },
  { icon: "🛡️", label: "Autoverzekering", sub: "WA, beperkt casco of allrisk" },
  { icon: "🛣️", label: "Wegenbelasting", sub: "Motorrijtuigenbelasting per kwartaal" },
  { icon: "🔧", label: "Onderhoud & APK", sub: "Banden, service, kleine reparaties" },
  { icon: "🎲", label: "Onvoorzien", sub: "Pech, parkeerschade, extra kosten" },
];

const AUTO_PRESETS = [
  { label: "Geen auto", waarde: 0 },
  { label: "Klein & zuinig", waarde: 350, sub: "Bijv. Citroën C1, tweedehands" },
  { label: "Gemiddeld", waarde: 600, sub: "Bijv. VW Golf, Peugeot 308" },
  { label: "Elektrisch", waarde: 500, sub: "Lagere brandstof, hogere afschrijving" },
  { label: "Luxe / groot", waarde: 950, sub: "Bijv. BMW, SUV" },
  { label: "Zelf invullen", waarde: null },
];

const BOODSCHAPPEN_PRESETS = [
  { label: "Sober", waarde: 280, sub: "Weinig vlees, huismerken" },
  { label: "Gemiddeld", waarde: 420, sub: "Gevarieerd, supermarkt" },
  { label: "Bewust & bio", waarde: 580, sub: "Veel vers, biologisch" },
  { label: "Royaal", waarde: 750, sub: "Premium, weinig op prijs letten" },
  { label: "Zelf invullen", waarde: null },
];

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

function PresetKnoppen({ presets, value, onChange, label }) {
  const heeftVastePreset = presets.some(p => p.waarde !== null && p.waarde === value);
  const zelfinvullenActief = !heeftVastePreset;
  return (
    <div>
      {label && <Lbl>{label}</Lbl>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {presets.map((p, i) => {
          const isActief = p.waarde !== null ? p.waarde === value : zelfinvullenActief;
          return (
            <button key={i}
              onClick={() => { if (p.waarde !== null) onChange(p.waarde); else onChange(0); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${isActief ? C.gold : C.border}`, background: isActief ? C.goldPale : C.surface, color: isActief ? C.gold : C.muted, fontSize: 12, fontWeight: isActief ? 600 : 400, cursor: "pointer" }}>
              {p.label}
              {p.sub && <div style={{ fontSize: 10, color: isActief ? C.gold : C.dim }}>{p.sub}</div>}
            </button>
          );
        })}
      </div>
      {zelfinvullenActief && (
        <NumInp value={value} onChange={onChange} prefix="€" suffix="/mnd" placeholder="Vul jouw bedrag in" />
      )}
    </div>
  );
}

// ─── HOOFDCOMPONENT ──────────────────────────────────────────────────────────
export default function VrijheidsWizard() {
  const [stap, setStap]             = useState(0);
  const [openGroep, setOpenGroep]   = useState("Wonen");
  const [spaarrente]                = useState(SPAARRENTE_FALLBACK);
  const accountRefs                 = useRef({});

  // ── Profiel ──
  const [profiel, setProfiel] = useState({
    naam: "", geboortejaar: "", stopLeeftijd: 55, inkomen: "",
    partner: false, werkType: "loondienst", kinderen: [],
    partnerVerdeling: 50,
    partnerPerCategorie: {}, // { groepId: pct }
  });

  // ── Lifestyle ──
  const defLS = Object.fromEntries(ALLE_ITEMS.map(i => [i.key, 0]));
  const [ls, setLs] = useState({ ...defLS, woningWaarde: 0, bouwjaar: 0, huurder: false, onderhoudOverride: null });
  const [verzek, setVerzek]         = useState([]);
  const [verzekOpen, setVerzekOpen] = useState(false);
  const [leningen, setLeningen]     = useState([]);
  const [extraAflossing, setExtraAflossing] = useState({}); // { leningId: bedrag }

  // ── Vermogen ──
  const [accounts, setAccounts]     = useState([]);
  const [schulden, setSchulden]     = useState([]); // { id, label, bedrag, rente, maandlast, looptijdJaar, startjaar }
  const [passiefInkomens, setPasInkomens] = useState([]); // { id, label, type, maand, groeiPct }

  // ── Pensioen ──
  const [pens, setPens] = useState({
    heeftWerkgever: false, werkgever: 0, werkgeverLeeftijd: 68,
    heeftEigen: false, eigen: 0, eigenLeeftijd: 68,
    jaarruimteInleg: 0, factorA: 0,
    eigenOverride: false, // gebruiker heeft eigen waarde ingevuld, niet auto-berekend
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

  const partnerAandeel   = profiel.partner ? (profiel.partnerVerdeling / 100) : 1.0;
  const getGroepAandeel  = (groepId) => {
    if (!profiel.partner) return 1.0;
    return (profiel.partnerPerCategorie[groepId] ?? profiel.partnerVerdeling) / 100;
  };

  // Kinderen
  const kinderenWegOpStop = profiel.kinderen.filter(k => (gbjaar + stopLft - k.geboortejaar) >= UITWONEN_LEEFTIJD);
  const kostenPerKindMnd  = profiel.kinderen.length > 0 ? (ls.kinderen / profiel.kinderen.length) : 0;
  const kinderKostenWeg   = kinderenWegOpStop.length * kostenPerKindMnd;

  // Woning
  const autoOnderhoud  = (ls.woningWaarde > 0 && ls.bouwjaar > 0 && !ls.huurder) ? berekenOnderhoud(ls.woningWaarde, ls.bouwjaar) : 0;
  const onderhoudMaand = ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud;

  // Hypotheek met extra aflossingen
  const leningMetAfl = leningen.map(d => {
    const ea = extraAflossing[d.id] || 0;
    return { ...d, hoofdsom: Math.max(0, d.hoofdsom - ea) };
  });
  const leningCalc      = leningMetAfl.map(d => ({ ...d, ...berekenHypoDeel(d) }));
  const leningCalcOrig  = leningen.map(d => ({ ...d, ...berekenHypoDeel(d) }));
  const hypoMaandNu     = leningCalc.reduce((s, d) => s + d.maand, 0);
  const hypoMaandNuOrig = leningCalcOrig.reduce((s, d) => s + d.maand, 0);
  const hypoRestschuld  = leningCalc.reduce((s, d) => s + d.restschuld, 0);
  const hypoOpStop      = leningCalc.reduce((s, d) => d.eindjaar > stopJaar ? s + d.maand : s, 0);
  const hypoOpStopOrig  = leningCalcOrig.reduce((s, d) => d.eindjaar > stopJaar ? s + d.maand : s, 0);
  const hypotheekVrij   = !ls.huurder && leningen.length > 0 && hypoOpStop === 0;
  const totaalExtraAfl  = Object.values(extraAflossing).reduce((s, v) => s + (v || 0), 0);

  // Jaren hypotheek na vrije leeftijd
  const maxEindjaar     = leningCalc.reduce((m, d) => Math.max(m, d.eindjaar || 0), 0);
  const jarenHypoNaStop = Math.max(0, maxEindjaar - stopJaar);

  // Aflossingsschema voor grafiek
  const aflossingsData = (() => {
    if (!leningen.length) return [];
    const jarenOrig = {};
    const jarenMet  = {};
    leningCalcOrig.forEach(l => (l.schema || []).forEach(s => { jarenOrig[s.jaar] = (jarenOrig[s.jaar] || 0) + s.restschuld; }));
    leningCalc.forEach(l => (l.schema || []).forEach(s => { jarenMet[s.jaar] = (jarenMet[s.jaar] || 0) + s.restschuld; }));
    const allJaren = [...new Set([...Object.keys(jarenOrig), ...Object.keys(jarenMet)])].map(Number).sort((a, b) => a - b);
    return allJaren.map(j => ({ jaar: j, leeftijd: j - 2025 + leeftijd, label: `${j - 2025 + leeftijd}j`, restschuld: jarenOrig[j] || 0, metAflossing: jarenMet[j] || 0 }));
  })();

  // Verzekeringen (NIET meetellen in mobiliteit — al apart)
  const verzekMaand = verzek.reduce((s, v) => s + (v.bedrag || 0), 0);

  // Schulden
  const totaalSchulden = schulden.reduce((s, d) => s + (d.bedrag || 0), 0);
  const maandlastSchulden = schulden.reduce((s, d) => s + (d.maandlast || 0), 0);

  // Levensstijl totaal
  const maandBruto = ALLE_ITEMS.reduce((s, item) => {
    if (item.key === "onderhoud") return s + onderhoudMaand;
    if (item.key === "verzekeringen") return s; // afzonderlijk via verzekMaand
    const v = ls[item.key] || 0;
    return s + (item.div ? v / item.div : v);
  }, 0) + verzekMaand;

  // Per groep aandeel toepassen
  const maandNu = CATS.reduce((s, groep) => {
    const aandeel = getGroepAandeel(groep.groep);
    const groepTot = groep.items.reduce((gs, item) => {
      if (item.key === "onderhoud") return gs + onderhoudMaand;
      if (item.key === "verzekeringen") return gs;
      const v = ls[item.key] || 0;
      return gs + (item.div ? v / item.div : v);
    }, 0);
    return s + groepTot * aandeel;
  }, 0) + verzekMaand * partnerAandeel + maandlastSchulden;

  let maandOpStop = CATS.reduce((s, groep) => {
    const aandeel = getGroepAandeel(groep.groep);
    const groepTot = groep.items.reduce((gs, item) => {
      if (item.key === "onderhoud") return gs + onderhoudMaand;
      if (item.key === "verzekeringen") return gs;
      const v = ls[item.key] || 0;
      return gs + (item.div ? v / item.div : v);
    }, 0);
    return s + groepTot * aandeel;
  }, 0) + verzekMaand * partnerAandeel;

  if (!ls.huurder && hypoMaandNuOrig > 0) {
    maandOpStop = maandOpStop - (hypoMaandNuOrig * partnerAandeel) + (hypoOpStop * partnerAandeel);
  }
  maandOpStop = Math.max(0, maandOpStop - kinderKostenWeg * partnerAandeel);

  const jaarOpStop  = maandOpStop * 12 * Math.pow(1 + INFLATIE, jarenTotStop);
  const cashNodig   = maandNu * 6;

  const jaarruimteCalc = berekenJaarruimte(parseFloat(profiel.inkomen) || 0, profiel.werkType, pens.factorA);

  // Auto-bereken eigenPensioen uit lijfrente-accounts
  const lijfrenteAccounts = accounts.filter(a => a.catId === "lijfrente");
  const lijfrenteTotaalOpStop = lijfrenteAccounts.reduce((s, a) => {
    const r = a.rendement || 0.06;
    return s + (a.waarde || 0) * Math.pow(1 + r, jarenTotStop) + (a.inlegMnd || 0) * 12 * ((Math.pow(1 + r, jarenTotStop) - 1) / r || jarenTotStop);
  }, 0);
  // Omzetten naar maandinkomen (20 jaar uitkering)
  const eigenPensAutoMaand = Math.round(lijfrenteTotaalOpStop / (20 * 12));

  const aowBij        = aowGat ? 0 : aowMaand;
  const pensBij       = (pens.heeftWerkgever && stopLft >= pens.werkgeverLeeftijd) ? pens.werkgever : 0;
  const eigenPensBij  = (pens.heeftEigen && stopLft >= pens.eigenLeeftijd) ? (pens.eigenOverride ? pens.eigen : eigenPensAutoMaand) : 0;
  const totaalPasInkomenMaand = passiefInkomens.reduce((s, x) => s + (x.maand || 0), 0);
  const totaalPassief = aowBij + pensBij + eigenPensBij + totaalPasInkomenMaand;

  const benodigdPot   = Math.max(0, jaarOpStop - totaalPassief * 12) / FIRE_PCT;

  const totaalVerm    = accounts.reduce((s, a) => s + (a.waarde || 0), 0) - totaalSchulden;
  const totaalInleg   = accounts.reduce((s, a) => s + (a.inlegMnd || 0), 0);

  const scenarios     = accounts.length > 0
    ? bouwAccountPrognose(leeftijd, stopLft, accounts.map(a => ({ id: a.id, waarde: Math.max(0, a.waarde || 0), inlegMnd: a.inlegMnd || 0, rendement: a.rendement || 0.05 })), benodigdPot)
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

  const inkomenUitPot      = vermOpStopM * FIRE_PCT / 12;
  const totaalMaandInkomen = inkomenUitPot + totaalPassief;

  // Extra inleg berekenen voor tekort
  const extraNodig = !doelBereikt && jarenTotStop > 0
    ? Math.ceil((benodigdPot - totaalVerm * Math.pow(1.06, jarenTotStop)) / ((Math.pow(1.06, jarenTotStop) - 1) / (0.06 / 12)) / 12)
    : 0;
  // Max realistic extra werkjaren = stop t/m 67 jaar (AOW-leeftijd max)
  const maxExtraWerkjaren = Math.max(0, 67 - stopLft);
  // How many extra years of saving would close the gap
  const extraWerkjarenRauw = verschil < 0 && jaarOpStop > 0 ? Math.ceil(Math.abs(verschil) / (totaalInleg * 12 + jaarOpStop * 0.02)) : 0;
  const extraWerkjaren = Math.min(extraWerkjarenRauw, maxExtraWerkjaren);
  const langerWerkenHaalbaar = maxExtraWerkjaren > 0;

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
    const cat  = ACCOUNT_CATS.find(c => c.id === catId);
    const rend = catId === "sparen" ? spaarrente : catId === "cash" ? 0 : (cat?.rendMidden || 0.05);
    const id   = Date.now();
    setAccounts(p => [...p, { id, label: cat?.label || "Rekening", catId, waarde: 0, inlegMnd: 0, rendement: rend }]);
    setTimeout(() => {
      accountRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }
  const delAccount = (id) => setAccounts(p => p.filter(a => a.id !== id));
  const updAccount = (id, k, v) => setAccounts(p => p.map(a => a.id === id ? { ...a, [k]: v } : a));

  function addSchuld() {
    const id = Date.now();
    setSchulden(p => [...p, { id, label: "Lening / schuld", bedrag: 0, rente: 0, maandlast: 0, looptijdJaar: 0, startjaar: 2020 }]);
    setTimeout(() => { accountRefs.current["schuld_" + id]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80);
  }
  const delSchuld = (id) => setSchulden(p => p.filter(s => s.id !== id));
  const updSchuld = (id, k, v) => setSchulden(p => p.map(s => s.id === id ? { ...s, [k]: v } : s));

  function addPasInkomen(type) {
    const labels = { huur: "Huurinkomsten vastgoed", dividend: "Dividend aandelen", rente: "Rente-inkomsten", overig: "Overig passief inkomen" };
    const id = Date.now();
    setPasInkomens(p => [...p, { id, label: labels[type] || "Passief inkomen", type, maand: 0, groeiPct: type === "huur" ? 2 : type === "dividend" ? 3 : 1 }]);
    setTimeout(() => { accountRefs.current["pas_" + id]?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80);
  }
  const delPasInkomen = (id) => setPasInkomens(p => p.filter(x => x.id !== id));
  const updPasInkomen = (id, k, v) => setPasInkomens(p => p.map(x => x.id === id ? { ...x, [k]: v } : x));
  const totaalPasInkomen = passiefInkomens.reduce((s, x) => s + (x.maand || 0), 0);

  // Noodfonds peil
  const spaartotaal   = accounts.filter(a => a.catId === "sparen" || a.catId === "cash").reduce((s, a) => s + (a.waarde || 0), 0);
  const noodfondsPct  = cashNodig > 0 ? Math.min(100, Math.round((spaartotaal / cashNodig) * 100)) : 0;

  // Hypotheekvrij-visualisatie
  const hypotheekKleur = hypotheekVrij ? C.greenLight : (jarenHypoNaStop > 5 ? C.red : C.gold);

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

      <div>

        {/* ════════════════════════════════════════
            STAP 1 — PROFIEL
        ════════════════════════════════════════ */}
        {stap === 0 && (
          <Card accent={C.gold}>
            <Kop size={26} sub="Laten we beginnen met de basis. Alle berekeningen blijven privé op jouw apparaat.">Vertel ons iets over jezelf</Kop>
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
                <Lbl info="Bruto jaarsalaris inclusief vakantiegeld. Als ZZP: gemiddelde jaarwinst.">Bruto jaarinkomen</Lbl>
                <NumInp value={profiel.inkomen} onChange={v => setP("inkomen", v)} prefix="€" placeholder="bijv. 60.000" />
              </div>
              <div>
                <Lbl info="Bepaalt je fiscale ruimte om belastingvrij pensioen op te bouwen.">Werksituatie</Lbl>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["loondienst","In loondienst"],["zzp","ZZP / zelfstandige"]].map(([val,lbl]) => (
                    <button key={val} onClick={() => setP("werkType", val)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `2px solid ${profiel.werkType === val ? C.gold : C.border}`, background: profiel.werkType === val ? C.goldPale : C.surface, color: profiel.werkType === val ? C.gold : C.muted, fontWeight: profiel.werkType === val ? 600 : 400, fontSize: 13 }}>{lbl}</button>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <CheckBox checked={profiel.partner} onChange={v => setP("partner", v)}
                  label="Ik plan samen met een partner"
                  sub={profiel.partner ? `Jouw AOW: ${eur(AOW_SAMENWONEND)}/mnd · Partner: ${eur(AOW_SAMENWONEND)}/mnd` : `Jouw AOW: ${eur(AOW_ALLEENSTAAND)}/mnd (alleenstaand)`} />
                {profiel.partner && (
                  <div style={{ marginTop: 12, background: C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.gold}30` }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>💑 Standaard kostenverdeling</div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>Vul hier jouw standaard aandeel in. Per categorie (wonen, boodschappen, etc.) kun je dit later aanpassen als jullie het anders verdelen.</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <span style={{ fontSize: 13, color: C.muted, whiteSpace: "nowrap" }}>Jij betaalt:</span>
                      <input type="range" min={10} max={100} step={5} value={profiel.partnerVerdeling} onChange={e => setP("partnerVerdeling", +e.target.value)} style={{ flex: 1 }} />
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: C.gold, fontWeight: 600, minWidth: 50 }}>{profiel.partnerVerdeling}%</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 4 }}>
                      <span>Jij: {profiel.partnerVerdeling}%</span><span>Partner: {100 - profiel.partnerVerdeling}%</span>
                    </div>
                    <InfoBox style={{ marginTop: 10 }}>Alle bedragen zijn jouw aandeel. Je partner maakt idealiter een eigen plan.</InfoBox>
                  </div>
                )}
              </div>

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
                        <div style={{ fontSize: 11, marginTop: 4, color: uitHuis ? C.greenLight : C.gold, fontWeight: 500 }}>{uitHuis ? `✓ Op vrije leeftijd al ${lftStop} jaar — kosten vallen weg` : `Op vrije leeftijd ${lftStop} jaar — nog thuis`}</div>
                      </div>
                      <button onClick={() => delKind(k.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 20, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "14px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>AOW-leeftijd: <span style={{ fontFamily: "'DM Mono',monospace", color: aow.zeker ? C.greenLight : C.gold }}>{aow.leeftijd} jaar</span></div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>⚠️ {aow.disclaimer}</div>}
                  {aowGat && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: C.red }}>Je stopt {jarenGat} jaar vóór je AOW — dit moet je zelf overbruggen</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{profiel.partner ? "samenwonend" : "alleenstaand"}</div>
                </div>
              </div>
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

              {/* Woninggegevens */}
              <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, marginBottom: 14, color: C.text }}>🏠 Woning</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                  <div><Lbl>Woningwaarde (WOZ)</Lbl><NumInp value={ls.woningWaarde} onChange={v => setL("woningWaarde", v)} prefix="€" placeholder="bijv. 400.000" /></div>
                  <div><Lbl info="Bouwjaar bepaalt hoe hoog het onderhoud is.">Bouwjaar</Lbl><NumInp value={ls.bouwjaar} onChange={v => setL("bouwjaar", v)} placeholder="bijv. 1995" /></div>
                  <div>
                    <Lbl info="Automatisch berekend op basis van woningwaarde en bouwjaar.">Onderhoud/mnd</Lbl>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <NumInp value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud} onChange={v => setL("onderhoudOverride", v)} prefix="€" placeholder="0" />
                      {ls.onderhoudOverride !== null && <button onClick={() => setL("onderhoudOverride", null)} style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.gold, whiteSpace: "nowrap" }}>↺ auto</button>}
                    </div>
                    {ls.onderhoudOverride === null && autoOnderhoud > 0 && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Auto: {eur(autoOnderhoud)}/mnd</div>}
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
                    const c         = leningCalc.find(b => b.id === deel.id) || {};
                    const cOrig     = leningCalcOrig.find(b => b.id === deel.id) || {};
                    const ea        = extraAflossing[deel.id] || 0;
                    const aflVoorStop = c.eindjaar && c.eindjaar <= stopJaar;
                    const restNaStop  = c.eindjaar ? Math.max(0, c.eindjaar - stopJaar) : 0;
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
                          <div><Lbl info="Totale looptijd — resterende looptijd wordt automatisch berekend.">Looptijd</Lbl><NumInp value={deel.looptijdJaar} onChange={v => updLening(deel.id, "looptijdJaar", v)} suffix="jaar" placeholder="30" /></div>
                          <div><Lbl info="Jaar dat de hypotheek is afgesloten.">Startjaar</Lbl><NumInp value={deel.startjaar} onChange={v => updLening(deel.id, "startjaar", v)} placeholder="2020" /></div>
                          <div>
                            <Lbl info="Annuïteit: vaste maandlast. Lineair: dalende maandlast. Aflossingsvrij: alleen rente.">Soort</Lbl>
                            <select value={deel.soort} onChange={e => updLening(deel.id, "soort", e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.text }}>
                              <option value="annuiteit">Annuïteit</option><option value="lineair">Lineair</option><option value="aflossingsvrij">Aflossingsvrij</option>
                            </select>
                          </div>
                        </div>

                        {/* Hypotheekinzicht */}
                        <div style={{ marginTop: 12, background: aflVoorStop ? C.greenPale : C.goldPale, borderRadius: 10, padding: "12px 16px", border: `1px solid ${(aflVoorStop ? C.greenLight : C.gold)}30` }}>
                          {aflVoorStop ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 28 }}>🎉</span>
                              <div>
                                <div style={{ fontWeight: 700, color: C.greenLight, fontSize: 14 }}>Hypotheekvrij op je vrije leeftijd!</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Afgelost in {c.eindjaar} — dat scheelt {eur((cOrig.maand || 0) * partnerAandeel)}/mnd in je budget.</div>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>
                                Op vrije leeftijd ({stopLft} jaar): nog {restNaStop} jaar hypotheek te betalen
                              </div>
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                                Maandlast op dat moment: {eur(c.maand || 0)}/mnd · Nog {eur(c.restschuld || 0)} restschuld
                              </div>
                              {/* Voortgangsbalk jaren resterend */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                                <div style={{ flex: 1, height: 6, background: C.surface, borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ width: `${Math.max(5, Math.min(100, 100 - (restNaStop / deel.looptijdJaar) * 100))}%`, height: "100%", background: C.gold, borderRadius: 3 }} />
                                </div>
                                <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{restNaStop} jaar resterend na vrije leeftijd</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Extra aflossing */}
                        <div style={{ marginTop: 10, background: C.surface, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>💡 Wat als je een deel in één keer aflost?</div>
                          <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>Plan je een extra aflossing? Voer het bedrag in en zie direct het effect op je maandlast en restschuld.</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            <div><Lbl>Extra aflossing</Lbl><NumInp value={ea} onChange={v => setExtraAflossing(p => ({ ...p, [deel.id]: v }))} prefix="€" placeholder="0" /></div>
                            <div style={{ background: C.card, borderRadius: 8, padding: "8px 12px" }}>
                              <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>Maandlast na aflossing</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: ea > 0 ? C.greenLight : C.muted, fontWeight: 600 }}>{eur(c.maand || 0)}/mnd</div>
                              {ea > 0 && <div style={{ fontSize: 10, color: C.greenLight, marginTop: 2 }}>Was {eur(cOrig.maand || 0)}/mnd</div>}
                            </div>
                            <div style={{ background: C.card, borderRadius: 8, padding: "8px 12px" }}>
                              <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>Restschuld na aflossing</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: ea > 0 ? C.greenLight : C.muted, fontWeight: 600 }}>{eur(c.restschuld || 0)}</div>
                              {ea > 0 && <div style={{ fontSize: 10, color: C.greenLight, marginTop: 2 }}>Was {eur(cOrig.restschuld || 0)}</div>}
                            </div>
                          </div>
                          {ea > 0 && c.eindjaar <= stopJaar && cOrig.eindjaar > stopJaar && (
                            <div style={{ marginTop: 8, background: C.greenPale, borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>🎉</span>
                              <div style={{ fontSize: 13, color: C.greenLight, fontWeight: 600 }}>Met deze aflossing ben je hypotheekvrij op je vrije leeftijd!</div>
                            </div>
                          )}
                        </div>

                        {deel.soort === "aflossingsvrij" && <div style={{ marginTop: 8, fontSize: 12, color: C.gold, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 8, padding: "8px 12px" }}>⚠ Aflossingsvrij: op einddatum ({c.eindjaar||"?"}) is {eur(deel.hoofdsom)} ineens opeisbaar.</div>}
                      </div>
                    );
                  })}
                  {leningen.length > 0 && hypoRestschuld > 0 && (
                    <div style={{ padding: "14px 18px", background: hypotheekVrij ? C.greenPale : C.goldPale, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Totaal op vrije leeftijd ({stopLft} jaar)</div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{hypotheekVrij ? "✓ Alle leningen afgelost — hypotheekvrij!" : `Nog ${jarenHypoNaStop} jaar hypotheek na je vrije leeftijd`}</div>
                          {totaalExtraAfl > 0 && <div style={{ fontSize: 11, color: C.greenLight, marginTop: 2 }}>Incl. {eur(totaalExtraAfl)} extra aflossing</div>}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 600, color: hypotheekVrij ? C.greenLight : hypotheekKleur }}>{hypotheekVrij ? "Hypotheekvrij ✓" : `${eur(hypoOpStop)}/mnd`}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Verzekeringen */}
            <Card style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
              <button onClick={() => setVerzekOpen(!verzekOpen)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7a5a8a" }} />
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
                    {[...VERZEKERING_OPTIES, { id: "overig_v", label: "Overige verzekeringen", bench: 0, info: "Vul hier zelf een bedrag in voor verzekeringen die er niet tussen staan." }].map(opt => {
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

            {/* Categorie accordeons — mobiliteit apart, auto-inleg van hypotheek */}
            {CATS.map(groep => {
              const isOpen     = openGroep === groep.groep;
              const groepAandeel = getGroepAandeel(groep.groep);
              const totaalBruto = groep.items.reduce((s, item) => {
                if (item.key === "onderhoud") return s + onderhoudMaand;
                if (item.key === "verzekeringen") return s;
                const v = ls[item.key] || 0;
                if (item.key === "huurHypo" && !ls.huurder && hypoMaandNuOrig > 0) return s + hypoMaandNuOrig;
                return s + (item.div ? v / item.div : v);
              }, 0);
              const totaal = totaalBruto * groepAandeel;

              return (
                <Card key={groep.groep} style={{ marginBottom: 10, padding: 0, overflow: "hidden" }}>
                  <button onClick={() => setOpenGroep(isOpen ? null : groep.groep)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer" }}>
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

                      {/* Partner verdeling per categorie */}
                      {profiel.partner && (
                        <div style={{ margin: "12px 0 14px", padding: "12px 14px", background: C.goldPale, borderRadius: 10, border: `1px solid ${C.gold}30` }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>💑 Verdeling voor {groep.groep}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>Jij:</span>
                            <input type="range" min={0} max={100} step={5}
                              value={profiel.partnerPerCategorie[groep.groep] ?? profiel.partnerVerdeling}
                              onChange={e => setP("partnerPerCategorie", { ...profiel.partnerPerCategorie, [groep.groep]: +e.target.value })}
                              style={{ flex: 1 }} />
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: C.gold, fontWeight: 600, minWidth: 36 }}>{profiel.partnerPerCategorie[groep.groep] ?? profiel.partnerVerdeling}%</span>
                            {profiel.partnerPerCategorie[groep.groep] !== undefined && (
                              <button onClick={() => { const p2 = { ...profiel.partnerPerCategorie }; delete p2[groep.groep]; setP("partnerPerCategorie", p2); }} style={{ fontSize: 10, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}>↺ standaard</button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mobiliteit — zichtbare kostenuitleg + preset */}
                      {groep.groep === "Mobiliteit" && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>🚗 Wat valt onder autokosten?</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                            {MOBILITEIT_UITLEG.map((m, i) => (
                              <div key={i} style={{ background: C.surface, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 16, marginBottom: 3 }}>{m.icon}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{m.label}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.sub}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Autoverzekering vul je bij Verzekeringen in — dat tellen we hier niet dubbel.</div>
                          <PresetKnoppen presets={AUTO_PRESETS} value={ls.auto || 0} onChange={v => setL("auto", v)} label="Kies jouw autotype of vul zelf in" />
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 0 }}>
                        {groep.items.filter(item => {
                          if (groep.groep === "Mobiliteit" && item.key === "auto") return false; // al gedaan via preset
                          if (item.key === "verzekeringen") return false; // aparte sectie
                          return true;
                        }).map(item => {
                          const isHuurHypo = item.key === "huurHypo";
                          const v = item.key === "onderhoud" ? onderhoudMaand
                            : isHuurHypo && !ls.huurder && hypoMaandNuOrig > 0 ? hypoMaandNuOrig
                            : (ls[item.key] || 0);
                          const bM  = item.div ? item.bench / item.div : item.bench;
                          const vM  = item.div ? v / item.div : v;
                          const low = bM > 50 && vM > 0 && vM < bM * 0.5;

                          const isBoodschappen = item.key === "boodschappen";
                          const isReadonly     = isHuurHypo && !ls.huurder && hypoMaandNuOrig > 0;

                          return (
                            <div key={item.key}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{item.label}</span>
                              </div>
                              {item.key === "onderhoud" ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <NumInp value={ls.onderhoudOverride !== null ? ls.onderhoudOverride : autoOnderhoud} onChange={v => setL("onderhoudOverride", v)} prefix="€" suffix="/mnd" placeholder="0" />
                                  {ls.onderhoudOverride !== null && <button onClick={() => setL("onderhoudOverride", null)} style={{ background: C.goldPale, border: `1px solid ${C.gold}40`, borderRadius: 8, padding: "8px 8px", fontSize: 10, color: C.gold }}>↺</button>}
                                </div>
                              ) : isReadonly ? (
                                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontFamily: "'DM Mono',monospace", fontSize: 14, color: C.muted }}>
                                  {eur(v)}/mnd <span style={{ fontSize: 10 }}>(uit hypotheek)</span>
                                </div>
                              ) : isBoodschappen ? (
                                <PresetKnoppen presets={BOODSCHAPPEN_PRESETS} value={v} onChange={val => setL(item.key, val)} />
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
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Jouw aandeel op vrije leeftijd</div>
                  {hypotheekVrij && <div style={{ fontSize: 12, color: C.greenLight, marginTop: 3 }}>🎉 Hypotheekvrij op vrije leeftijd — scheelt {eur(hypoOpStopOrig * partnerAandeel)}/mnd</div>}
                  {kinderenWegOpStop.length > 0 && <div style={{ fontSize: 12, color: C.greenLight }}>✓ Kinderen uit huis — scheelt {eur(kinderKostenWeg * partnerAandeel)}/mnd</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, color: C.gold, fontWeight: 500 }}>{eur(maandOpStop)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>/mnd · nu {eur(maandNu)}</div>
                </div>
              </div>
              <InfoBox style={{ marginTop: 10 }}>Over {jarenTotStop} jaar kost dit door prijsstijgingen <strong>{eur(jaarOpStop)} per jaar</strong>.</InfoBox>
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
              <Kop size={26} sub="Voeg al je rekeningen en bezittingen toe. Je ziet direct hoe elk bijdraagt aan jouw vrijheid.">Jouw geld</Kop>

              {/* Noodfonds — prominent */}
              <div style={{ marginTop: 16, background: noodfondsPct >= 100 ? C.greenPale : noodfondsPct >= 50 ? C.goldPale : `${C.red}10`, borderRadius: 14, padding: "16px 20px", border: `2px solid ${noodfondsPct >= 100 ? C.greenLight : noodfondsPct >= 50 ? C.gold : C.red}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>🛟 Noodfonds</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                      Een noodfonds is een direct beschikbaar bedrag voor onverwachte uitgaven — auto-pech, kapotte wasmachine, medische kosten. Aanbevolen: <strong>6 maanden</strong> van je vaste lasten ({eur(cashNodig)}).
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: noodfondsPct >= 100 ? C.greenLight : noodfondsPct >= 50 ? C.gold : C.red }}>{noodfondsPct}%</div>
                    <div style={{ fontSize: 11, color: C.muted }}>gedekt</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 10, background: C.surface, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${noodfondsPct}%`, height: "100%", background: noodfondsPct >= 100 ? C.greenLight : noodfondsPct >= 50 ? C.gold : C.red, borderRadius: 5, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{eur(spaartotaal)} / {eur(cashNodig)}</span>
                </div>
                {noodfondsPct < 100 && <div style={{ marginTop: 8, fontSize: 12, color: noodfondsPct >= 50 ? C.gold : C.red }}>
                  {noodfondsPct < 50 ? `Je noodfonds is nog laag. Bouw eerst ${eur(cashNodig - spaartotaal)} op voordat je verder belegt.` : `Goed op weg! Nog ${eur(cashNodig - spaartotaal)} voor een volledig noodfonds.`}
                </div>}
                {noodfondsPct >= 100 && <div style={{ marginTop: 8, fontSize: 12, color: C.greenLight, fontWeight: 600 }}>✓ Je noodfonds is op orde. Alles extra kan je laten groeien.</div>}
              </div>

              {/* Categorie uitleg */}
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {ACCOUNT_CATS.map(cat => (
                  <div key={cat.id} style={{ background: C.surface, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cat.emoji} {cat.label}</div>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: cat.kleur, fontWeight: 600, background: `${cat.kleur}18`, padding: "2px 7px", borderRadius: 6 }}>~{(cat.rendMidden * 100).toFixed(0)}%/jr</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{cat.uitleg}</div>
                    <button onClick={() => addAccount(cat.id)} style={{ marginTop: 10, background: `${cat.kleur}15`, border: `1px solid ${cat.kleur}40`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: cat.kleur, fontWeight: 600, cursor: "pointer" }}>+ Toevoegen</button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, background: C.goldPale, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.gold}30`, fontSize: 12, color: C.muted }}>
                💡 <strong>Spaarrente:</strong> {(spaarrente * 100).toFixed(1)}% ({SPAARRENTE_DATUM}). Dit is de gemiddelde marktrente voor vrij opneembare spaarrekeningen. Je kunt dit per rekening aanpassen.
              </div>

              {accounts.length === 0 && <div style={{ marginTop: 16, padding: "20px", textAlign: "center", color: C.dim, fontSize: 14, fontStyle: "italic" }}>Klik hierboven op "+ Toevoegen" om te beginnen.</div>}

              {accounts.map(acc => {
                const cat = ACCOUNT_CATS.find(c => c.id === acc.catId);
                const waardeBij = (acc.waarde || 0) > 0 || (acc.inlegMnd || 0) > 0
                  ? (acc.waarde || 0) * Math.pow(1 + acc.rendement, jarenTotStop) + (acc.inlegMnd || 0) * 12 * ((Math.pow(1 + acc.rendement, jarenTotStop) - 1) / (acc.rendement || 0.001))
                  : 0;
                const groei    = waardeBij - (acc.waarde || 0) - (acc.inlegMnd || 0) * 12 * jarenTotStop;
                const ingelegd = (acc.inlegMnd || 0) * 12 * jarenTotStop;
                return (
                  <div key={acc.id} ref={el => accountRefs.current[acc.id] = el} style={{ marginTop: 10, background: C.surface, borderRadius: 12, border: `2px solid ${cat?.kleur || C.border}30`, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{cat?.emoji || "💼"}</span>
                        <div>
                          <input value={acc.label} onChange={e => updAccount(acc.id, "label", e.target.value)}
                            style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px dashed ${C.border}`, padding: "2px 4px", width: 180 }} />
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>✏️ Klik om naam te wijzigen</div>
                        </div>
                        <span style={{ fontSize: 11, background: `${cat?.kleur || C.gold}18`, color: cat?.kleur || C.gold, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{cat?.label}</span>
                      </div>
                      <button onClick={() => delAccount(acc.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <Lbl info="Hoeveel staat er nu op deze rekening of in dit bezit?">Huidige waarde</Lbl>
                        <NumInp value={acc.waarde} onChange={v => updAccount(acc.id, "waarde", v)} prefix="€" placeholder="0" />
                      </div>
                      <div>
                        <Lbl info="Hoeveel leg je hier elke maand bij?">Maandelijkse inleg</Lbl>
                        <NumInp value={acc.inlegMnd} onChange={v => updAccount(acc.id, "inlegMnd", v)} prefix="€" suffix="/mnd" placeholder="0" />
                      </div>
                      <div>
                        <Lbl info={acc.catId === "sparen" ? "Rente die de bank betaalt per jaar." : acc.catId === "cash" ? "Contant geld groeit niet — rendement is 0%." : `Verwacht jaarlijks groeipercentage. Vuistregel: ${((cat?.rendBand?.[0]||0)*100).toFixed(0)}–${((cat?.rendBand?.[1]||0.1)*100).toFixed(0)}%.`}>Groei per jaar (%)</Lbl>
                        {acc.catId === "cash"
                          ? <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.dim, fontFamily: "'DM Mono',monospace" }}>0% — geen rendement</div>
                          : <NumInp value={+(acc.rendement * 100).toFixed(1)} onChange={v => updAccount(acc.id, "rendement", v / 100)} suffix="%" placeholder="5" />
                        }
                        {cat?.rendBand && acc.catId !== "cash" && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Vuistregel: {(cat.rendBand[0]*100).toFixed(0)}–{(cat.rendBand[1]*100).toFixed(0)}%/jr</div>}
                      </div>
                    </div>

                    {/* Compounding visualisatie - fixed layout */}
                    {waardeBij > 0 && (() => {
                      const bars = [
                        { lbl: "Huidig saldo", val: acc.waarde || 0, opacity: 0.4 },
                        { lbl: "Extra inleg", val: Math.max(0, ingelegd), opacity: 0.65 },
                        { lbl: "Groei", val: Math.max(0, groei), opacity: 1.0 },
                        { lbl: "Totaal", val: waardeBij, opacity: 1.0, isTotal: true },
                      ];
                      const maxVal = waardeBij;
                      const kleur = cat?.kleur || C.gold;
                      return (
                        <div style={{ marginTop: 12, background: `${kleur}08`, borderRadius: 10, padding: "14px 16px", border: `1px solid ${kleur}20` }}>
                          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                            Op vrije leeftijd ({stopLft} jaar) — effect van rente-op-rente:
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                            {bars.map((bar, i) => {
                              const heightPct = maxVal > 0 ? Math.max(8, (bar.val / maxVal) * 80) : 8;
                              return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: kleur, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>{eur(bar.val)}</div>
                                  <div style={{ width: "100%", background: bar.isTotal ? kleur : kleur, opacity: bar.isTotal ? 1 : bar.opacity, borderRadius: "4px 4px 0 0", height: `${heightPct}px`, border: bar.isTotal ? `2px solid ${kleur}` : "none" }} />
                                  <div style={{ fontSize: 10, color: C.muted, textAlign: "center", lineHeight: 1.3 }}>{bar.lbl}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ marginTop: 8, fontSize: 11, color: kleur }}>
                            Rente-op-rente effect: <strong>{eur(Math.max(0, groei))}</strong> extra groei bij {(acc.rendement * 100).toFixed(1)}%/jr over {jarenTotStop} jaar.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Overige schulden — hypotheek staat al bij Levensstijl */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>💳 Overige schulden</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Persoonlijke leningen, studieschuld, creditcard, etc. — <em>niet</em> je hypotheek, die staat al bij Levensstijl</div>
                  </div>
                  <button onClick={addSchuld} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 13, color: C.muted }}>+ Schuld toevoegen</button>
                </div>
                {schulden.length === 0 && <div style={{ fontSize: 13, color: C.dim, fontStyle: "italic" }}>Geen schulden — goed bezig!</div>}
                {schulden.map(s => {
                  const heeftLooptijd = s.looptijdJaar > 0 && s.startjaar > 0;
                  const eindjaar = heeftLooptijd ? s.startjaar + s.looptijdJaar : null;
                  const isAfgelostOpStop = eindjaar && eindjaar <= stopJaar;
                  return (
                    <div key={s.id} ref={el => accountRefs.current["schuld_" + s.id] = el} style={{ padding: "14px 16px", background: `${C.red}08`, borderRadius: 12, border: `1px solid ${C.red}30`, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input value={s.label} onChange={e => updSchuld(s.id, "label", e.target.value)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px dashed ${C.border}`, padding: "2px 4px", width: 180 }} />
                          {eindjaar && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: isAfgelostOpStop ? `${C.greenLight}20` : `${C.red}15`, color: isAfgelostOpStop ? C.greenLight : C.red, fontWeight: 600 }}>{isAfgelostOpStop ? `✓ Afgelost (${eindjaar})` : `Loopt t/m ${eindjaar}`}</span>}
                        </div>
                        <button onClick={() => delSchuld(s.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                        <div><Lbl>Schuldbedrag</Lbl><NumInp value={s.bedrag} onChange={v => updSchuld(s.id, "bedrag", v)} prefix="€" placeholder="0" /></div>
                        <div><Lbl>Rente/jaar</Lbl><NumInp value={s.rente} onChange={v => updSchuld(s.id, "rente", v)} suffix="%" placeholder="0" /></div>
                        <div><Lbl info="Looptijd in jaren, bijv. 5 jaar voor een persoonlijke lening.">Looptijd (jaar)</Lbl><NumInp value={s.looptijdJaar} onChange={v => updSchuld(s.id, "looptijdJaar", v)} suffix="jaar" placeholder="0" /></div>
                        <div><Lbl info="Startjaar van de lening.">Startjaar</Lbl><NumInp value={s.startjaar} onChange={v => updSchuld(s.id, "startjaar", v)} placeholder="2020" /></div>
                      </div>
                      <div style={{ marginTop: 8 }}><Lbl>Maandlast</Lbl><NumInp value={s.maandlast} onChange={v => updSchuld(s.id, "maandlast", v)} prefix="€" suffix="/mnd" placeholder="0" /></div>
                    </div>
                  );
                })}
                {schulden.length > 0 && (
                  <div style={{ padding: "10px 14px", background: `${C.red}10`, borderRadius: 10, border: `1px solid ${C.red}30`, fontSize: 13, color: C.red, fontWeight: 600 }}>
                    Totale schulden: {eur(totaalSchulden)} · Maandlasten: {eur(maandlastSchulden)}/mnd
                  </div>
                )}
              </div>

              {/* Passief inkomen */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>🏦 Passief inkomen</div>
                <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                  Inkomen dat je ontvangt zonder actief te werken. Denk aan huurinkomsten van vastgoed, dividend van aandelen, of rente-inkomsten. Dit telt mee in je vrijheidsplan.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    { type: "huur", label: "🏠 Huurinkomsten", sub: "Extra woning, appartement" },
                    { type: "dividend", label: "📈 Dividend", sub: "Aandelen, ETF's met uitkering" },
                    { type: "rente", label: "💵 Rente-inkomsten", sub: "Obligaties, uitgeleend geld" },
                    { type: "overig", label: "➕ Overig", sub: "Royalties, licenties, etc." },
                  ].map(opt => (
                    <button key={opt.type} onClick={() => addPasInkomen(opt.type)} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, fontSize: 12, cursor: "pointer" }}>
                      <div style={{ fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: C.dim }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
                {passiefInkomens.length === 0 && <div style={{ fontSize: 13, color: C.dim, fontStyle: "italic" }}>Nog geen passief inkomen toegevoegd.</div>}
                {passiefInkomens.map(p => (
                  <div key={p.id} ref={el => accountRefs.current["pas_" + p.id] = el} style={{ padding: "12px 14px", background: C.greenPale, borderRadius: 10, border: `1px solid ${C.greenLight}30`, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <input value={p.label} onChange={e => updPasInkomen(p.id, "label", e.target.value)} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600, color: C.text, background: "transparent", border: "none", borderBottom: `1px dashed ${C.border}`, padding: "2px 4px", width: 200 }} />
                      <button onClick={() => delPasInkomen(p.id)} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18 }}>×</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <Lbl info="Hoeveel ontvang je hier nu per maand (of verwacht je te ontvangen)?">Maandelijks bedrag</Lbl>
                        <NumInp value={p.maand} onChange={v => updPasInkomen(p.id, "maand", v)} prefix="€" suffix="/mnd" placeholder="0" />
                      </div>
                      <div>
                        <Lbl info="Verwachte jaarlijkse groei van dit inkomen, bijv. huurstijging of dividendgroei.">Jaarlijkse groei</Lbl>
                        <NumInp value={p.groeiPct} onChange={v => updPasInkomen(p.id, "groeiPct", v)} suffix="%" placeholder="2" />
                      </div>
                    </div>
                    {p.maand > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: C.greenLight }}>
                        Op vrije leeftijd: ±{eur(Math.round(p.maand * Math.pow(1 + (p.groeiPct || 0) / 100, jarenTotStop)))}/mnd
                      </div>
                    )}
                  </div>
                ))}
                {passiefInkomens.length > 0 && (
                  <div style={{ padding: "10px 14px", background: C.greenPale, borderRadius: 10, border: `1px solid ${C.greenLight}30`, fontSize: 13, color: C.greenLight, fontWeight: 600 }}>
                    Totaal passief inkomen: {eur(totaalPasInkomen)}/mnd · Op vrije leeftijd: ±{eur(Math.round(passiefInkomens.reduce((s,p) => s + p.maand * Math.pow(1 + (p.groeiPct||0)/100, jarenTotStop), 0)))}/mnd
                  </div>
                )}
              </div>

              {/* Totaal vermogen */}
              {accounts.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: totaalVerm > 0 ? C.greenPale : `${C.red}10`, borderRadius: 12, border: `1px solid ${totaalVerm > 0 ? C.greenLight : C.red}40` }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 600, color: C.text }}>Netto vermogen</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Bezittingen min schulden · Inleg: {eur(totaalInleg)}/mnd</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, color: totaalVerm > 0 ? C.greenLight : C.red, fontWeight: 600 }}>{eur(totaalVerm)}</div>
                </div>
              )}
            </Card>

            {/* Piechart vermogensverdeling */}
            {accounts.length > 0 && totaalVerm > 0 && (() => {
              const pieData = accounts
                .filter(a => (a.waarde || 0) > 0)
                .map(a => {
                  const cat = ACCOUNT_CATS.find(c => c.id === a.catId);
                  return { name: a.label, value: a.waarde, kleur: cat?.kleur || C.gold };
                });
              if (pieData.length < 2) return null;
              return (
                <Card>
                  <Kop size={18} sub="Hoe is jouw vermogen verdeeld over verschillende typen?">Vermogensverdeling</Kop>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "0 0 200px", height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.kleur} opacity={0.9} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => [eur(v), ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {pieData.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.kleur, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 13, color: C.text }}>{d.name}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: d.kleur, fontWeight: 600 }}>{eur(d.value)}</div>
                          <div style={{ fontSize: 11, color: C.muted, width: 36, textAlign: "right" }}>{Math.round((d.value / totaalVerm) * 100)}%</div>
                        </div>
                      ))}
                      {schulden.length > 0 && <div style={{ paddingTop: 8, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.red }}>Schulden: -{eur(totaalSchulden)} · Netto: {eur(totaalVerm)}</div>}
                    </div>
                  </div>
                </Card>
              );
            })()}

            {/* Prognose grafiek */}
            {accounts.length > 0 && grafData.length > 0 && (
              <Card>
                <Kop size={18} sub="Dit is de optelsom van al je bezittingen — elk met een ander rendement">Vermogensgroei — gecombineerd overzicht</Kop>
                <p style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
                  De grafiek toont hoe al jouw geld samen groeit. {accounts.length > 1 ? `Je hebt ${accounts.length} posten ingevoerd — elk groeit tegen eigen rendement.` : ""} De drie lijnen laten zien wat er kan gebeuren als beleggingen tegenvallen, gemiddeld uitpakken, of meevallen.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 4, flexWrap: "wrap" }}>
                  {[
                    { lbl: "😟 Tegenvaller", val: eur(vermOpStopP), clr: C.red },
                    { lbl: "📊 Verwacht",    val: eur(vermOpStopM), clr: C.gold },
                    { lbl: "🚀 Meevaller",   val: eur(vermOpStopO), clr: C.greenLight },
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
                        <linearGradient id="gOpt2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.2}/><stop offset="95%" stopColor={C.greenLight} stopOpacity={0}/></linearGradient>
                        <linearGradient id="gMid2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold}       stopOpacity={0.2}/><stop offset="95%" stopColor={C.gold}       stopOpacity={0}/></linearGradient>
                        <linearGradient id="gPes2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}        stopOpacity={0.15}/><stop offset="95%" stopColor={C.red}       stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `€${(v/1000000).toFixed(1)}M` : `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ScenTip />} />
                      <ReferenceLine y={benodigdPot} stroke={C.gold} strokeDasharray="6 3" label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                      <Area type="monotone" dataKey="opt"      name="🚀 Meevaller"  stroke={C.greenLight} fill="url(#gOpt2)" strokeWidth={2}   dot={false} />
                      <Area type="monotone" dataKey="vermogen" name="📊 Verwacht"   stroke={C.gold}       fill="url(#gMid2)" strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="pess"     name="😟 Tegenvaller" stroke={C.red}       fill="url(#gPes2)" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
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

            <div style={{ marginTop: 20, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 10, color: C.text }}>📚 Drie soorten inkomsten later</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🏛️", titel: "AOW", sub: "Van de overheid", tekst: `Iedereen in NL krijgt automatisch AOW vanaf ${aow.leeftijd} jaar. Je hoeft hier niets voor te doen.`, kleur: C.greenLight },
                  { icon: "🏢", titel: "Via werkgever", sub: "Als je in loondienst werkt", tekst: "Je werkgever bouwt pensioen voor je op. Je krijgt dit pas op je pensioendatum (vaak 68 jaar).", kleur: C.gold },
                  { icon: "🔒", titel: "Eigen opbouw", sub: "Zelf geregeld", tekst: "Extra pensioen dat je zelf hebt opgebouwd via banksparen of lijfrente — inclusief de lijfrente-rekeningen die je bij 'Jouw geld' hebt toegevoegd.", kleur: "#7a5a8a" },
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

            {/* AOW */}
            <div style={{ marginTop: 16, background: aow.zeker ? C.greenPale : C.goldPale, borderRadius: 12, padding: "16px 18px", border: `1px solid ${(aow.zeker ? C.greenLight : C.gold)}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Jouw AOW — automatisch vanaf {aow.leeftijd} jaar</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{aow.bron}</div>
                  {aow.disclaimer && <div style={{ fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>⚠️ {aow.disclaimer}</div>}
                  {aowGat && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: C.red }}>Je stopt {jarenGat} jaar vóór je AOW. Dit gat van {eur(maandOpStop * 12 * jarenGat)} overbrugt je met eigen vermogen.</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: aow.zeker ? C.greenLight : C.gold, fontWeight: 600 }}>{eur(aowMaand)}/mnd</div>
                  <span style={{ fontSize: 10, background: aow.zeker ? `${C.greenLight}20` : `${C.gold}20`, color: aow.zeker ? C.green : C.gold, padding: "2px 10px", borderRadius: 10, fontWeight: 600, display: "inline-block", marginTop: 4 }}>{aow.zeker ? "Officieel ✓" : "Schatting"}</span>
                </div>
              </div>
            </div>

            {/* Werkgever */}
            <div style={{ marginTop: 16 }}>
              <CheckBox checked={pens.heeftWerkgever} onChange={v => setPn("heeftWerkgever", v)}
                label="Ik heb pensioen via mijn werkgever"
                sub="In loondienst? Dan bouwt je werkgever waarschijnlijk pensioen voor je op." />
              {pens.heeftWerkgever && (
                <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>Kijk op <strong>mijnpensioenoverzicht.nl</strong> voor jouw bedragen. Zoek naar "verwacht pensioen op pensioendatum".</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <Lbl info="Staat op je pensioenoverzicht als 'verwacht pensioen'.">Verwacht bedrag</Lbl>
                      <NumInp value={pens.werkgever} onChange={v => setPn("werkgever", v)} prefix="€" suffix="/mnd" placeholder="0" />
                    </div>
                    <div>
                      <Lbl info="Vanaf welke leeftijd ontvang je dit? Staat ook op het overzicht. Vaak 67 of 68 jaar.">Beschikbaar vanaf</Lbl>
                      <NumInp value={pens.werkgeverLeeftijd} onChange={v => setPn("werkgeverLeeftijd", v)} suffix="jaar" placeholder="68" />
                    </div>
                  </div>
                  {pens.werkgeverLeeftijd > stopLft && (
                    <div style={{ marginTop: 10, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>⚠️ Gat van {pens.werkgeverLeeftijd - stopLft} jaar zonder dit pensioen</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 8, height: 32, alignItems: "center" }}>
                        <div style={{ flex: stopLft - leeftijd, background: C.gold, opacity: 0.3, borderRadius: "4px 0 0 4px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>Opbouw</span>
                        </div>
                        <div style={{ flex: pens.werkgeverLeeftijd - stopLft, background: C.red, opacity: 0.5, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>Gat — geen pensioen</span>
                        </div>
                        <div style={{ flex: 10, background: C.greenLight, opacity: 0.4, borderRadius: "0 4px 4px 0", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>Pensioen {pens.werkgever > 0 ? eur(pens.werkgever)+"/mnd" : ""}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted, marginTop: 4 }}>
                        <span>Vrij op {stopLft} jaar</span><span>Pensioen op {pens.werkgeverLeeftijd} jaar</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>Benodigd overbruggingsbedrag: <strong style={{ color: C.red }}>{eur(maandOpStop * 12 * (pens.werkgeverLeeftijd - stopLft))}</strong></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Eigen pensioen — auto-gevuld vanuit lijfrente */}
            <div style={{ marginTop: 12 }}>
              <CheckBox checked={pens.heeftEigen} onChange={v => setPn("heeftEigen", v)}
                label="Ik heb zelf extra pensioen opgebouwd"
                sub="Eigen bankspaarrekening, lijfrente, of ander pensioenproduct." />
              {pens.heeftEigen && (
                <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
                  {lijfrenteAccounts.length > 0 && (
                    <div style={{ marginBottom: 14, background: `#7a5a8a18`, borderRadius: 10, padding: "12px 14px", border: `1px solid #7a5a8a30` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>Automatisch berekend vanuit jouw lijfrente-rekeningen:</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: "#7a5a8a", fontWeight: 600 }}>{eur(eigenPensAutoMaand)}/mnd</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Gebaseerd op {eur(lijfrenteTotaalOpStop)} totaal over 20 jaar uitkering</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <input type="checkbox" id="eigenOverride" checked={pens.eigenOverride} onChange={e => setPn("eigenOverride", e.target.checked)} />
                        <label htmlFor="eigenOverride" style={{ fontSize: 12, color: C.muted, cursor: "pointer" }}>Eigen bedrag invullen (overschrijf automatische berekening)</label>
                      </div>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <Lbl>Verwacht bedrag</Lbl>
                      <NumInp value={pens.eigenOverride || lijfrenteAccounts.length === 0 ? pens.eigen : eigenPensAutoMaand} onChange={v => { setPn("eigen", v); setPn("eigenOverride", true); }} prefix="€" suffix="/mnd" placeholder="0" style={{ opacity: !pens.eigenOverride && lijfrenteAccounts.length > 0 ? 0.6 : 1 }} />
                    </div>
                    <div>
                      <Lbl info="Vanaf welke leeftijd is dit beschikbaar?">Beschikbaar vanaf</Lbl>
                      <NumInp value={pens.eigenLeeftijd} onChange={v => setPn("eigenLeeftijd", v)} suffix="jaar" placeholder="68" />
                    </div>
                  </div>
                  {pens.eigenLeeftijd > stopLft && <InfoBox type="let_op" style={{ marginTop: 10 }}>Dit geld komt pas vrij op {pens.eigenLeeftijd} jaar. De {pens.eigenLeeftijd - stopLft} jaar eerder moet je overbruggen.</InfoBox>}
                </div>
              )}
            </div>

            {/* Jaarruimte */}
            <div style={{ marginTop: 16 }}>
              <Card style={{ background: C.greenPale, border: `1px solid ${C.greenLight}40` }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>💡 Belastingvrij extra sparen voor later</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
                  De overheid laat je jaarlijks een bepaald bedrag belastingvrij opzij zetten voor later. Je betaalt dan minder belasting nú, en pas bij opname. Dit heet jaarruimte.
                  {profiel.werkType === "loondienst" ? " In loondienst hangt je ruimte af van wat je werkgever al opbouwt." : " Als ZZP'er mag je 30% van je winst gebruiken."}
                </p>
                {profiel.werkType === "loondienst" && (
                  <div style={{ marginBottom: 14 }}>
                    <Lbl info="Factor A staat op je UPO — het jaarlijkse overzicht dat je werkgever stuurt. Het is de pensioenopbouw in euro's. Heb je geen UPO? Vul 0 in.">Factor A (staat op je UPO)</Lbl>
                    <NumInp value={pens.factorA} onChange={v => setPn("factorA", v)} prefix="€" suffix="/jaar" placeholder="0" />
                  </div>
                )}
                <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Jouw ruimte om belastingvrij te sparen</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: C.greenLight, fontWeight: 700 }}>{eur(jaarruimteCalc)}/jaar</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Lbl info="Hoeveel zet je dit jaar al in een lijfrente of bankspaarrekening?">Hoeveel gebruik je hier al van?</Lbl>
                  <NumInp value={pens.jaarruimteInleg} onChange={v => setPn("jaarruimteInleg", v)} prefix="€" suffix="/jaar" placeholder="0" />
                </div>
                {pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && <InfoBox type="goed" style={{ marginTop: 10 }}>Je laat <strong>{eur(jaarruimteCalc - pens.jaarruimteInleg)}/jaar</strong> onbenut. Dit belastingvoordeel kan je direct inzetten.</InfoBox>}
              </Card>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setStap(2)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14 }}>← Terug</button>
              <button onClick={() => setStap(4)} style={{ background: C.gold, border: "none", borderRadius: 12, padding: "13px 28px", color: "#fff", fontWeight: 600, fontSize: 15 }}>Bekijk mijn vrijheidsplan →</button>
            </div>
          </Card>
        )}

        {/* ════════════════════════════════════════
            STAP 5 — VRIJHEIDSPLAN RAPPORT
        ════════════════════════════════════════ */}
        {stap === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── HERO ── */}
            <div style={{ background: doelBereikt ? `linear-gradient(135deg, ${C.greenPale} 0%, ${C.goldPale} 100%)` : `linear-gradient(135deg, ${C.goldPale} 0%, #fff8f0 100%)`, borderRadius: 18, padding: "28px 32px", border: `1px solid ${doelBereikt ? C.greenLight : C.gold}40` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 8 }}>Jouw vrijheidsplan — {new Date().getFullYear()}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                    {profiel.naam ? `${profiel.naam}, ` : ""}
                    {doelBereikt ? "je vrijheid is haalbaar 🎉" : "een doel dat binnen bereik ligt ✦"}
                  </div>
                  <p style={{ fontSize: 15, color: C.muted, marginTop: 10, lineHeight: 1.7, maxWidth: 520 }}>
                    Op <strong>{stopLft} jaar</strong> wil jij financieel vrij zijn — over <strong>{jarenTotStop} jaar</strong>.
                    Je verwacht dan <strong>{eur(vermOpStopM)}</strong> te hebben opgebouwd.
                    Je hebt <strong>{eur(benodigdPot)}</strong> nodig.
                    {doelBereikt ? ` Dat geeft een overschot van ${eur(verschil)}.` : ` Dat is een verschil van ${eur(Math.abs(verschil))}.`}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 48, fontWeight: 500, color: doelBereikt ? C.greenLight : C.gold, lineHeight: 1 }}>{doelBereikt ? "+" : "-"}{eur(Math.abs(verschil))}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{doelBereikt ? "overschot" : "tekort"}</div>
                  {doelBereikt && pessOk && <div style={{ marginTop: 8, fontSize: 12, color: C.greenLight, fontWeight: 600 }}>✓ Ook in slechte tijden haalbaar</div>}
                  {doelBereikt && !pessOk && <div style={{ marginTop: 8, fontSize: 12, color: C.gold, fontWeight: 600 }}>⚡ Alleen bij goede rendementen</div>}
                </div>
              </div>

              {/* Voortgangsbalk */}
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 6 }}>
                  <span>Nu: {eur(totaalVerm)}</span>
                  <span>Doel: {eur(benodigdPot)}</span>
                </div>
                <div style={{ height: 12, background: C.surface, borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.max(5, (totaalVerm / benodigdPot) * 100))}%`, height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.greenLight})`, borderRadius: 6, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{Math.round((totaalVerm / benodigdPot) * 100)}% van je doel bereikt</div>
              </div>
            </div>

            {/* ── KEY METRICS ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {[
                { icon: "💰", lbl: "Doel — wat je nodig hebt", val: eur(benodigdPot), sub: "Om voor altijd van te leven", clr: C.gold },
                { icon: "📈", lbl: "Wat je opbouwt", val: eur(vermOpStopM), sub: "Meest waarschijnlijk scenario", clr: doelBereikt ? C.greenLight : C.red },
                { icon: "📅", lbl: "Maandbudget", val: `${eur(maandOpStop)}/mnd`, sub: hypotheekVrij ? "Hypotheekvrij ✓" : `Incl. ${eur(hypoOpStop * partnerAandeel)}/mnd hypotheek`, clr: C.gold },
                { icon: "🏛️", lbl: "Passief inkomen later", val: `${eur(totaalPassief)}/mnd`, sub: `AOW${pens.heeftWerkgever?" + pensioen":""}${pens.heeftEigen?" + eigen":""}${passiefInkomens.length > 0 ? " + huur/div." : ""}`, clr: C.greenLight },
              ].map((m, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.lbl}</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, color: m.clr, fontWeight: 700 }}>{m.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* ── MAANDINKOMEN BREAKDOWN ── */}
            <Card>
              <Kop size={18} sub="Hoeveel heb je per maand en waar komt het vandaan?">Jouw maandinkomen op vrije leeftijd</Kop>
              <div style={{ marginTop: 16 }}>
                {[
                  { icon: "📊", lbl: "Uit je opgebouwde vermogen", val: inkomenUitPot, sub: `3,5% van ${eur(vermOpStopM)} per jaar, maandelijks opnemen`, clr: C.greenLight, show: vermOpStopM > 0 },
                  { icon: "🏛️", lbl: `AOW${aowGat ? ` — pas vanaf ${aow.leeftijd} jaar` : ""}`, val: aowBij, sub: profiel.partner ? "Samenwonend tarief" : "Alleenstaand tarief", clr: C.gold, show: true },
                  { icon: "🏢", lbl: `Werkgeverspensioen${pens.werkgeverLeeftijd > stopLft ? ` — pas vanaf ${pens.werkgeverLeeftijd} jaar` : ""}`, val: pensBij, sub: "Via je werkgever", clr: "#7a5a8a", show: pens.heeftWerkgever },
                  { icon: "🔒", lbl: `Eigen pensioen${pens.eigenLeeftijd > stopLft ? ` — pas vanaf ${pens.eigenLeeftijd} jaar` : ""}`, val: eigenPensBij, sub: "Zelf opgebouwd", clr: "#4a90d9", show: pens.heeftEigen },
                  ...passiefInkomens.filter(p => p.maand > 0).map(p => ({
                    icon: p.type === "huur" ? "🏠" : p.type === "dividend" ? "📈" : p.type === "rente" ? "💵" : "➕",
                    lbl: p.label,
                    val: Math.round(p.maand * Math.pow(1 + (p.groeiPct||0)/100, jarenTotStop)),
                    sub: `Passief inkomen — groeit ${p.groeiPct||0}%/jr`,
                    clr: C.greenLight,
                    show: true,
                  })),
                ].filter(r => r.show).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{r.lbl}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{r.sub}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: r.val > 0 ? r.clr : C.dim, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {r.val > 0 ? `${eur(r.val)}/mnd` : "—"}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Totaal maandinkomen</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: totaalMaandInkomen >= maandOpStop ? C.greenLight : C.red, fontWeight: 700 }}>{eur(totaalMaandInkomen)}/mnd</div>
                </div>
                <div style={{ marginTop: 8, padding: "12px 16px", borderRadius: 10, background: totaalMaandInkomen >= maandOpStop ? C.greenPale : `${C.red}10`, border: `1px solid ${totaalMaandInkomen >= maandOpStop ? C.greenLight : C.red}30` }}>
                  {totaalMaandInkomen >= maandOpStop
                    ? <span style={{ fontSize: 13, color: C.greenLight, fontWeight: 600 }}>✓ Je maandinkomen ({eur(totaalMaandInkomen)}) dekt je budget ({eur(maandOpStop)}) — {eur(totaalMaandInkomen - maandOpStop)}/mnd over.</span>
                    : <span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>Je budget ({eur(maandOpStop)}/mnd) is hoger dan je inkomen ({eur(totaalMaandInkomen)}/mnd). Verschil: {eur(maandOpStop - totaalMaandInkomen)}/mnd.</span>}
                </div>
              </div>
            </Card>

            {/* ── DRIE SCENARIO GRAFIEK ── */}
            {grafData.length > 0 && (
              <Card>
                <Kop size={18} sub="Drie mogelijke uitkomsten — afhankelijk van hoe jouw beleggingen presteren">Vermogensgroei</Kop>
                <div style={{ display: "flex", gap: 10, marginTop: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  {[
                    { lbl: "😟 Tegenvaller", val: eur(vermOpStopP), clr: C.red, ok: pessOk },
                    { lbl: "📊 Verwacht",    val: eur(vermOpStopM), clr: C.gold, ok: doelBereikt },
                    { lbl: "🚀 Meevaller",   val: eur(vermOpStopO), clr: C.greenLight, ok: true },
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
                        <linearGradient id="r_opt"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.2}/><stop offset="95%" stopColor={C.greenLight} stopOpacity={0}/></linearGradient>
                        <linearGradient id="r_mid"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.gold}       stopOpacity={0.2}/><stop offset="95%" stopColor={C.gold}       stopOpacity={0}/></linearGradient>
                        <linearGradient id="r_pes"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red}        stopOpacity={0.15}/><stop offset="95%" stopColor={C.red}       stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000000 ? `€${(v/1000000).toFixed(1)}M` : `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<ScenTip />} />
                      <ReferenceLine y={benodigdPot} stroke={C.gold} strokeDasharray="6 3" label={{ value: "Doel", fill: C.gold, fontSize: 11, position: "insideTopRight" }} />
                      <Area type="monotone" dataKey="opt"      name="🚀 Meevaller"  stroke={C.greenLight} fill="url(#r_opt)" strokeWidth={2}   dot={false} />
                      <Area type="monotone" dataKey="vermogen" name="📊 Verwacht"   stroke={C.gold}       fill="url(#r_mid)" strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="pess"     name="😟 Tegenvaller" stroke={C.red}       fill="url(#r_pes)" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* ── HYPOTHEEK GRAFIEK ── */}
            {aflossingsData.length > 0 && (
              <Card>
                <Kop size={18} sub="Hoe je schuld daalt — en wanneer je hypotheekvrij bent">Hypotheekaflossing</Kop>
                <div style={{ height: 200, marginTop: 12 }}>
                  <ResponsiveContainer>
                    <AreaChart data={aflossingsData}>
                      <defs>
                        <linearGradient id="gH1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.red} stopOpacity={0.2}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/></linearGradient>
                        <linearGradient id="gH2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.greenLight} stopOpacity={0.15}/><stop offset="95%" stopColor={C.greenLight} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v, n) => [eur(v), n]} />
                      <Area type="monotone" dataKey="restschuld"   name="Zonder extra aflossing" stroke={C.red}        fill="url(#gH1)" strokeWidth={2} dot={false} />
                      {totaalExtraAfl > 0 && <Area type="monotone" dataKey="metAflossing" name={`Met ${eur(totaalExtraAfl)} extra aflossing`} stroke={C.greenLight} fill="url(#gH2)" strokeWidth={2} dot={false} />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* ── WAT KAN JE DOEN? ── */}
            <Card accent={doelBereikt ? C.greenLight : C.gold}>
              <Kop size={18} sub="Concrete opties om je plan te verbeteren of te versnellen">Wat kun je doen?</Kop>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>

                {!doelBereikt && (
                  <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}30`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 10 }}>🎯 Jouw tekort overbruggen</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { lbl: "Meer inleggen", val: `+${eur(Math.max(0, extraNodig))}/mnd`, sub: "extra inleg volstaat", icon: "💸" },
                        langerWerkenHaalbaar
                          ? { lbl: "Iets langer werken", val: extraWerkjaren > 0 ? `+${extraWerkjaren} jaar` : "Al maximaal", sub: maxExtraWerkjaren > 0 ? `Max. tot ${67} jaar (AOW-leeftijd)` : "Je zit al op of voorbij AOW-leeftijd", icon: "📅" }
                          : { lbl: "Later stoppen", val: "Niet van toepassing", sub: "Je bent al op of voorbij AOW-leeftijd", icon: "📅" },
                        { lbl: "Minder uitgeven", val: `-${eur(Math.abs(verschil) * FIRE_PCT / 12)}/mnd`, sub: "minder nodig op vrije leeftijd", icon: "✂️" },
                      ].map((opt, i) => (
                        <div key={i} style={{ background: C.card, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 20, marginBottom: 6 }}>{opt.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{opt.lbl}</div>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: C.gold, fontWeight: 700, marginTop: 4 }}>{opt.val}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {[
                  accounts.length === 0 && { icon: "💼", prio: "hoog", title: "Voeg je rekeningen toe", text: "Ga terug naar stap 3. Zonder gegevens zijn alle berekeningen een gok." },
                  pens.jaarruimteInleg < jaarruimteCalc && jaarruimteCalc > 0 && { icon: "💰", prio: "hoog", title: "Benut je belastingvoordeel", text: `Je kunt ${eur(jaarruimteCalc - pens.jaarruimteInleg)}/jaar extra belastingvrij sparen voor later. Dat is direct belastingteruggave.` },
                  aowGat && { icon: "⏳", prio: "hoog", title: `Overbrugging van ${jarenGat} jaar nodig`, text: `Je ontvangt pas AOW op ${aow.leeftijd}. Je hebt ${eur(maandOpStop * 12 * jarenGat)} nodig als overbrugging.` },
                  !aow.zeker && { icon: "📋", prio: "laag", title: "Houd de AOW-leeftijd in de gaten", text: "Jouw AOW-leeftijd is nog niet officieel vastgesteld. Check jaarlijks rijksoverheid.nl." },
                  hypotheekVrij && { icon: "🎉", prio: "goed", title: "Hypotheekvrij op vrije leeftijd", text: `Je betaalt geen hypotheek meer — dat scheelt ${eur(hypoOpStopOrig * partnerAandeel)}/mnd.` },
                  kinderenWegOpStop.length > 0 && { icon: "👶", prio: "goed", title: "Kinderkosten vallen weg", text: `${kinderenWegOpStop.length} kind${kinderenWegOpStop.length > 1 ? "eren zijn" : " is"} al het huis uit op vrije leeftijd. Scheelt ${eur(kinderKostenWeg * partnerAandeel)}/mnd.` },
                  doelBereikt && pessOk && { icon: "✦", prio: "goed", title: "Je bent op koers in alle scenario's", text: `Blijf consequent inleggen. Over ${jarenTotStop} jaar ben je er.` },
                  doelBereikt && !pessOk && { icon: "⚡", prio: "laag", title: "Bouw een buffer in voor tegenslagen", text: "In het slechtste scenario kom je net tekort. Een kleine extra inleg zorgt voor een veiliger plan." },
                  noodfondsPct < 100 && { icon: "🛟", prio: "hoog", title: "Vul je noodfonds aan", text: `Je noodfonds is ${noodfondsPct}% gevuld. Bouw eerst ${eur(cashNodig - spaartotaal)} op als vangnet.` },
                  totaalSchulden > 0 && { icon: "💳", prio: "hoog", title: "Los schulden af", text: `Je hebt ${eur(totaalSchulden)} aan schulden. Hoge rente schulden aflossen geeft gegarandeerd rendement.` },
                ].filter(Boolean).map((a, i) => {
                  const kleur = a.prio === "hoog" ? C.red : a.prio === "goed" ? C.greenLight : C.gold;
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, padding: "14px 16px", background: C.surface, borderRadius: 12, border: `1px solid ${kleur}20` }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{a.title}</div>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: `${kleur}18`, color: kleur, fontWeight: 600, textTransform: "uppercase" }}>{a.prio}</span>
                        </div>
                        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{a.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 12, padding: "12px 16px" }}>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>⚠️ <strong>Indicatie, geen financieel advies.</strong> Berekeningen gaan uit van ingevoerde bedragen, 2,5%/jaar prijsstijging en huidige belastingregels. Raadpleeg een financieel adviseur voor persoonlijk advies.</p>
            </div>
            <button onClick={() => setStap(3)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 22px", color: C.muted, fontWeight: 500, fontSize: 14, width: "fit-content" }}>← Aanpassen</button>
          </div>
        )}
      </div>
    </div>
  );
}

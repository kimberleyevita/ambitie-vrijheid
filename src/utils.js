// ─── FORMATERING ──────────────────────────────────────────────────────────────
export const eur = (n) => "\u20AC" + Math.max(0, Math.round(n)).toLocaleString("nl-NL");
export const pct = (n) => (Math.round(n * 10) / 10).toFixed(1) + "%";

// ─── WONING ───────────────────────────────────────────────────────────────────
export function berekenOnderhoud(woz, bouwjaar) {
  const oud = 2025 - bouwjaar;
  const p   = oud > 40 ? 0.018 : oud > 20 ? 0.014 : oud > 10 ? 0.011 : 0.010;
  return Math.round((woz * p) / 12);
}

// ─── AOW ──────────────────────────────────────────────────────────────────────
export function berekenAow(geboortejaar) {
  const aowJaar = geboortejaar + 67;
  if (aowJaar <= 2032) return { leeftijd: 67, zeker: true, bron: "Officieel vastgesteld (wet)", disclaimer: null };
  if (aowJaar <= 2037) return { leeftijd: 67, zeker: false, bron: "Prognose CPB \u2014 nog niet wettelijk vastgesteld", disclaimer: "De AOW-leeftijd voor jou is nog niet officieel vastgesteld. Op basis van de huidige koppeling wordt 67 jaar verwacht, maar dit kan wijzigen." };
  return { leeftijd: 68, zeker: false, bron: "Indicatie \u2014 mogelijk verhoging naar 68", disclaimer: "Jouw AOW-leeftijd is nog ruimschoots onbekend. We rekenen voorzichtig met 68 jaar." };
}

export const AOW_ALLEENSTAAND = 1450;
export const AOW_SAMENWONEND  = 1007;

// ─── HYPOTHEEK ────────────────────────────────────────────────────────────────
export function berekenHypoDeel(deel) {
  const r            = deel.rente / 100 / 12;
  const totM         = deel.looptijdJaar * 12;
  const verstM       = (2025 - deel.startjaar) * 12;
  const eindjaar     = deel.startjaar + deel.looptijdJaar;
  const restLooptijdJaar = Math.max(0, eindjaar - 2025);

  if (verstM >= totM) return { maand: 0, restschuld: 0, eindjaar, restLooptijdJaar: 0, schema: [] };

  function maakSchema(startSaldo, maandFn) {
    const schema = [];
    let s = startSaldo;
    for (let yr = 2025; yr <= eindjaar; yr++) {
      schema.push({ jaar: yr, restschuld: Math.round(Math.max(0, s)) });
      for (let m = 0; m < 12 && s > 0; m++) s = maandFn(s);
    }
    return schema;
  }

  if (deel.soort === "aflossingsvrij") {
    const maand = r > 0 ? Math.round(deel.hoofdsom * r) : 0;
    const schema = Array.from({ length: eindjaar - 2025 + 1 }, (_, i) => ({ jaar: 2025 + i, restschuld: deel.hoofdsom }));
    return { maand, restschuld: deel.hoofdsom, eindjaar, restLooptijdJaar, schema };
  }
  if (deel.soort === "lineair") {
    const mAfl  = deel.hoofdsom / totM;
    const saldo = Math.max(0, deel.hoofdsom - mAfl * verstM);
    return { maand: Math.round(mAfl + saldo * r), restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema: maakSchema(saldo, s => Math.max(0, s - mAfl)) };
  }
  if (r === 0) {
    const maand = Math.round(deel.hoofdsom / totM);
    const saldo = Math.max(0, deel.hoofdsom - maand * verstM);
    return { maand, restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema: maakSchema(saldo, s => Math.max(0, s - maand)) };
  }
  const ann = deel.hoofdsom * (r * Math.pow(1 + r, totM)) / (Math.pow(1 + r, totM) - 1);
  let saldo = deel.hoofdsom;
  for (let m = 0; m < Math.min(verstM, totM); m++) saldo = saldo * (1 + r) - ann;
  saldo = Math.max(0, saldo);
  return { maand: Math.round(ann), restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema: maakSchema(saldo, s => Math.max(0, s * (1 + r) - ann)) };
}

// ─── ACCOUNT-GEBASEERDE PROGNOSE ──────────────────────────────────────────────
// accounts = [{ id, waarde, inlegMnd, rendement (decimaal) }]
// Geeft per jaar drie scenario's terug (pess = rend*0.6, midden = rend, opt = rend*1.4)
// plus een uitsplitsing per account voor het compounding effect
export function bouwAccountPrognose(leeftijd, stopLeeftijd, accounts, doel) {
  const jaren = Math.max(0, stopLeeftijd - leeftijd);

  function scenarioFactor(key) {
    return key === "pess" ? 0.6 : key === "opt" ? 1.4 : 1.0;
  }

  function berekenScenario(scenKey) {
    const factor = scenarioFactor(scenKey);
    const state  = accounts.map(a => ({ ...a, v: a.waarde }));
    const data   = [];

    for (let j = 0; j <= jaren; j++) {
      const totaal = state.reduce((s, a) => s + a.v, 0);
      const uitsplit = Object.fromEntries(state.map(a => [a.id, Math.round(a.v)]));
      data.push({ leeftijd: leeftijd + j, label: `${leeftijd + j}j`, vermogen: Math.round(totaal), doel: Math.round(doel), ...uitsplit });
      state.forEach(a => { a.v = a.v * (1 + a.rendement * factor) + a.inlegMnd * 12; });
    }
    return data;
  }

  return {
    pess:   berekenScenario("pess"),
    midden: berekenScenario("midden"),
    opt:    berekenScenario("opt"),
  };
}

// Enkelvoudig (voor actieplan scenario's)
export function bouwPrognose(leeftijd, stopLeeftijd, vermNu, inlegMnd, rendement, doel) {
  const data = [];
  let v = vermNu;
  for (let j = 0; j <= stopLeeftijd - leeftijd; j++) {
    data.push({ leeftijd: leeftijd + j, label: `${leeftijd + j}j`, vermogen: Math.round(v), doel: Math.round(doel) });
    v = v * (1 + rendement) + inlegMnd * 12;
  }
  return data;
}

// ─── JAARRUIMTE ───────────────────────────────────────────────────────────────
export function berekenJaarruimte(bruto, werkType, factorA) {
  const premiegrondslag = Math.max(0, bruto - 17545);
  if (werkType === "zzp") return Math.min(34550, Math.max(0, Math.round(premiegrondslag * 0.30)));
  const ruimte = (premiegrondslag * 0.133) - (6.27 * (factorA || 0));
  return Math.min(34550, Math.max(0, Math.round(ruimte)));
}

// ─── ACCOUNT CATEGORIEËN MET STANDAARD RENDEMENTEN ────────────────────────────
// pess/midden/opt zijn de vuistregels; gebruiker kan midden aanpassen
export const ACCOUNT_CATS = [
  {
    id: "sparen",
    label: "Spaarrekening",
    emoji: "🏦",
    uitleg: "Geld op een gewone spaarrekening. Laag risico, laag rendement. Rente varieert met de markt.",
    rendMidden: 0.025,
    rendBand: [0.010, 0.040],
    isSpaar: true,
    kleur: "#4a90d9",
  },
  {
    id: "cash",
    label: "Contant / betaalrekening",
    emoji: "💵",
    uitleg: "Geld op een betaalrekening of contant thuis. Geen rendement, maar direct beschikbaar. Telt mee voor je noodfonds.",
    rendMidden: 0.00,
    rendBand: [0.00, 0.01],
    kleur: "#6b7280",
  },
  {
    id: "beleggen",
    label: "Beleggingsrekening",
    emoji: "📈",
    uitleg: "Aandelen, ETF's of fondsen. Hoger rendement op lange termijn, maar waarde kan schommelen.",
    rendMidden: 0.07,
    rendBand: [0.04, 0.11],
    kleur: "#3d8f62",
  },
  {
    id: "lijfrente",
    label: "Lijfrente / banksparen",
    emoji: "🔒",
    uitleg: "Pensioensparen met belastingvoordeel. Geld is geblokkeerd tot pensioenleeftijd — daarna maandelijks inkomen.",
    rendMidden: 0.06,
    rendBand: [0.04, 0.09],
    kleur: "#7a5a8a",
  },
  {
    id: "vastgoed",
    label: "Vastgoed / eigen woning",
    emoji: "🏠",
    uitleg: "Overwaarde of huurinkomsten uit vastgoed. Gemiddeld 3–6% rendement via huurinkomsten en waardestijging.",
    rendMidden: 0.04,
    rendBand: [0.02, 0.07],
    kleur: "#c47c2b",
  },
  {
    id: "crypto",
    label: "Crypto",
    emoji: "₿",
    uitleg: "Digitale valuta zoals Bitcoin. Zeer hoog risico, maar ook potentieel hoog rendement. Niet voor iedereen geschikt.",
    rendMidden: 0.10,
    rendBand: [0.00, 0.25],
    kleur: "#f0b429",
  },
  {
    id: "overig",
    label: "Overig / zelf invullen",
    emoji: "💼",
    uitleg: "Bedrijfsaandelen, een lening die je hebt uitstaan, of een ander type vermogen. Vul zelf het verwachte rendement in.",
    rendMidden: 0.04,
    rendBand: [0.00, 0.10],
    kleur: "#9a8060",
  },
];

export const INFLATIE = 0.025;
export const FIRE_PCT = 0.035;

// Huidige spaarrente (fallback als ophalen niet lukt)
export const SPAARRENTE_FALLBACK = 0.025;
export const SPAARRENTE_DATUM    = "maart 2025";

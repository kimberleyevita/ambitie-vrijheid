// ─── FORMATERING ──────────────────────────────────────────────────────────────
export const eur = (n) => "\u20AC" + Math.max(0, Math.round(n)).toLocaleString("nl-NL");

// ─── WONING ───────────────────────────────────────────────────────────────────
export function berekenOnderhoud(woz, bouwjaar) {
  const oud = 2025 - bouwjaar;
  const p   = oud > 40 ? 0.018 : oud > 20 ? 0.014 : oud > 10 ? 0.011 : 0.010;
  return Math.round((woz * p) / 12);
}

// ─── AOW ──────────────────────────────────────────────────────────────────────
export function berekenAow(geboortejaar) {
  const aowJaar = geboortejaar + 67;
  if (aowJaar <= 2032) return {
    leeftijd: 67, zeker: true,
    bron: "Officieel vastgesteld (wet)",
    disclaimer: null,
  };
  if (aowJaar <= 2037) return {
    leeftijd: 67, zeker: false,
    bron: "Prognose CPB \u2014 nog niet wettelijk vastgesteld",
    disclaimer: "De AOW-leeftijd voor jou is nog niet officieel vastgesteld. Op basis van de huidige koppeling wordt 67 jaar verwacht, maar dit kan wijzigen.",
  };
  return {
    leeftijd: 68, zeker: false,
    bron: "Indicatie \u2014 mogelijk verhoging naar 68",
    disclaimer: "Jouw AOW-leeftijd is nog ruimschoots onbekend. We rekenen voorzichtig met 68 jaar.",
  };
}

export const AOW_ALLEENSTAAND = 1450;
export const AOW_SAMENWONEND  = 1007;

// ─── HYPOTHEEK ────────────────────────────────────────────────────────────────
export function berekenHypoDeel(deel) {
  const r        = deel.rente / 100 / 12;
  const totM     = deel.looptijdJaar * 12;
  const verstM   = (2025 - deel.startjaar) * 12;
  const eindjaar = deel.startjaar + deel.looptijdJaar;
  const restLooptijdJaar = Math.max(0, eindjaar - 2025);

  if (verstM >= totM) return { maand: 0, restschuld: 0, eindjaar, restLooptijdJaar: 0, schema: [] };

  // Bouw aflossingsschema (restschuld per jaar vanaf 2025)
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
    const schema = [];
    for (let yr = 2025; yr <= eindjaar; yr++) {
      schema.push({ jaar: yr, restschuld: deel.hoofdsom });
    }
    return { maand, restschuld: deel.hoofdsom, eindjaar, restLooptijdJaar, schema };
  }

  if (deel.soort === "lineair") {
    const mAfl  = deel.hoofdsom / totM;
    const saldo = Math.max(0, deel.hoofdsom - mAfl * verstM);
    const maand = Math.round(mAfl + saldo * r);
    const schema = maakSchema(saldo, s => Math.max(0, s - mAfl));
    return { maand, restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema };
  }

  // annuiteit
  if (r === 0) {
    const maand = Math.round(deel.hoofdsom / totM);
    const saldo = Math.max(0, deel.hoofdsom - maand * verstM);
    const schema = maakSchema(saldo, s => Math.max(0, s - maand));
    return { maand, restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema };
  }

  const ann = deel.hoofdsom * (r * Math.pow(1 + r, totM)) / (Math.pow(1 + r, totM) - 1);
  let saldo = deel.hoofdsom;
  for (let m = 0; m < Math.min(verstM, totM); m++) saldo = saldo * (1 + r) - ann;
  saldo = Math.max(0, saldo);
  const schema = maakSchema(saldo, s => Math.max(0, s * (1 + r) - ann));
  return { maand: Math.round(ann), restschuld: Math.round(saldo), eindjaar, restLooptijdJaar, schema };
}

// ─── PROGNOSE — 3 SCENARIO'S ──────────────────────────────────────────────────
// rendPerCat = { beleggingen, sparen, lijfrente, overig }
//   elk = { pess, midden, opt } als decimaal
export function bouwPrognoseScenarios(leeftijd, stopLeeftijd, vermCats, rendPerCat, inlegMnd, doel) {
  const jaren = stopLeeftijd - leeftijd;

  function scenario(key) {
    const startTotaal = vermCats.beleggingen + vermCats.sparen + vermCats.lijfrente + vermCats.overig;
    let v = startTotaal;
    const data = [];
    for (let j = 0; j <= jaren; j++) {
      data.push({ leeftijd: leeftijd + j, label: `${leeftijd + j}j`, vermogen: Math.round(v), doel: Math.round(doel) });
      const t = Math.max(1, v);
      const rend =
        (vermCats.beleggingen / t) * rendPerCat.beleggingen[key] +
        (vermCats.sparen      / t) * rendPerCat.sparen[key] +
        (vermCats.lijfrente   / t) * rendPerCat.lijfrente[key] +
        (vermCats.overig      / t) * rendPerCat.overig[key];
      v = v * (1 + rend) + inlegMnd * 12;
    }
    return data;
  }

  return { pess: scenario("pess"), midden: scenario("midden"), opt: scenario("opt") };
}

// Enkelvoudige prognose (voor scenario-vergelijkingen in actieplan)
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

// ─── STANDAARD RENDEMENTEN ────────────────────────────────────────────────────
export const DEFAULT_REND = {
  beleggingen: { pess: 0.04, midden: 0.07, opt: 0.10 },
  sparen:      { pess: 0.015, midden: 0.025, opt: 0.035 },
  lijfrente:   { pess: 0.04, midden: 0.06, opt: 0.08  },
  overig:      { pess: 0.02, midden: 0.03, opt: 0.05  },
};

export const INFLATIE = 0.025;
export const FIRE_PCT = 0.035;

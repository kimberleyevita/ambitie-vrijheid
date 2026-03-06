// ─── FORMATERING ──────────────────────────────────────────────────────────────
export const eur = (n) => "\u20AC" + Math.max(0, Math.round(n)).toLocaleString("nl-NL");

// ─── WONING ───────────────────────────────────────────────────────────────────
export function berekenOnderhoud(woz, bouwjaar) {
  const oud = 2025 - bouwjaar;
  const p   = oud > 40 ? 0.018 : oud > 20 ? 0.014 : oud > 10 ? 0.011 : 0.010;
  return Math.round((woz * p) / 12);
}

// ─── AOW ──────────────────────────────────────────────────────────────────────
// Officieel vastgesteld t/m AOW-jaar 2032: 67 jaar
// Prognose CPB 2033–2037: 67 jaar
// Na 2037: indicatie 68 jaar
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
    disclaimer: "De AOW-leeftijd voor jou is nog niet officieel vastgesteld. Op basis van de huidige koppeling aan levensverwachting wordt 67 jaar verwacht, maar dit kan wijzigen.",
  };
  return {
    leeftijd: 68, zeker: false,
    bron: "Indicatie \u2014 mogelijk verhoging naar 68",
    disclaimer: "Jouw AOW-leeftijd is nog ruimschoots onbekend. We rekenen voorzichtig met 68 jaar. Historisch stijgt de AOW-leeftijd mee met de levensverwachting.",
  };
}

// AOW bedragen 2025 (netto per maand)
// Alleenstaande: €1.450, Samenwonend/gehuwd: €1.007 per persoon
export const AOW_ALLEENSTAAND  = 1450;
export const AOW_SAMENWONEND   = 1007;

// ─── HYPOTHEEK ────────────────────────────────────────────────────────────────
export function berekenHypoDeel(deel) {
  const r      = deel.rente / 100 / 12;
  const totM   = deel.looptijdJaar * 12;
  const verstM = (2025 - deel.startjaar) * 12;
  const eindjaar = deel.startjaar + deel.looptijdJaar;

  if (verstM >= totM) return { maand: 0, restschuld: 0, eindjaar };

  if (deel.soort === "aflossingsvrij") {
    return { maand: r > 0 ? Math.round(deel.hoofdsom * r) : 0, restschuld: deel.hoofdsom, eindjaar };
  }
  if (deel.soort === "lineair") {
    const mAfl  = deel.hoofdsom / totM;
    const saldo = Math.max(0, deel.hoofdsom - mAfl * verstM);
    return { maand: Math.round(mAfl + saldo * r), restschuld: Math.round(saldo), eindjaar };
  }
  // annuiteit
  if (r === 0) return { maand: Math.round(deel.hoofdsom / totM), restschuld: 0, eindjaar };
  const ann = deel.hoofdsom * (r * Math.pow(1 + r, totM)) / (Math.pow(1 + r, totM) - 1);
  let saldo = deel.hoofdsom;
  for (let m = 0; m < Math.min(verstM, totM); m++) saldo = saldo * (1 + r) - ann;
  return { maand: Math.round(ann), restschuld: Math.round(Math.max(0, saldo)), eindjaar };
}

// ─── PROGNOSE ─────────────────────────────────────────────────────────────────
export function bouwPrognose(leeftijd, stopLeeftijd, vermNu, inlegMnd, rendement, doel) {
  const data = [];
  let v = vermNu;
  const maxJaar = Math.min(stopLeeftijd - leeftijd + 5, 50);
  for (let j = 0; j <= maxJaar; j++) {
    data.push({
      leeftijd: leeftijd + j,
      label: `${leeftijd + j}j`,
      vermogen: Math.round(v),
      doel: Math.round(doel),
    });
    v = v * (1 + rendement) + inlegMnd * 12;
  }
  return data;
}

// ─── JAARRUIMTE ───────────────────────────────────────────────────────────────
// ZZP: geen factor A, volledige 30% van premiegrondslag
// Loondienst: factor A (pensioenopbouw werkgever) verlaagt de ruimte
//   Formule: (13,3% × premiegrondslag) - (6,27 × factor_A) - drempelaftrek
//   Factor A = jaarlijkse pensioenopbouw in euro's (staat op je UPO)
//   Drempelaftrek 2025: € 0 (afgeschaft)
//   Premiegrondslag = bruto - AOW-franchise (€ 17.545)
export function berekenJaarruimte(bruto, werkType, factorA) {
  const premiegrondslag = Math.max(0, bruto - 17545);
  if (werkType === "zzp") {
    // ZZP: 30% van premiegrondslag, max €34.550 (2025)
    return Math.min(34550, Math.max(0, Math.round(premiegrondslag * 0.30)));
  }
  // Loondienst: 13,3% minus factor A correctie
  const factorABedrag = factorA || 0;
  const ruimte = (premiegrondslag * 0.133) - (6.27 * factorABedrag);
  return Math.min(34550, Math.max(0, Math.round(ruimte)));
}

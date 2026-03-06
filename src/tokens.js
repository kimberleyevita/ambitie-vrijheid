// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
export const C = {
  bg:         "#faf7f2",
  surface:    "#f2ece0",
  card:       "#ffffff",
  border:     "#e8ddd0",
  gold:       "#b8862a",
  goldLight:  "#d4a44c",
  goldPale:   "#f5e9d0",
  green:      "#2d6b4a",
  greenLight: "#3d8f62",
  greenPale:  "#e8f3ec",
  red:        "#b85040",
  redPale:    "#fdf0ee",
  text:       "#1a1410",
  textSub:    "#5a4a3a",
  muted:      "#8a7a68",
  dim:        "#c8b8a8",
};

export const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif}
  input,select{font-family:'DM Sans',sans-serif;color:${C.text}}
  input::placeholder{color:${C.dim}}
  input:focus,select:focus{outline:2px solid ${C.gold};outline-offset:1px}
  button{cursor:pointer;font-family:'DM Sans',sans-serif}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .35s ease both}
`;

// ─── FINANCIËLE CONSTANTEN ─────────────────────────────────────────────────────
export const INFLATIE       = 0.025;   // 2,5% gemiddeld
export const AOW_MAAND      = 1450;    // alleenstaande netto 2025
export const EWF_PCT        = 0.0035;  // eigenwoningforfait
export const HRA_MAX_PCT    = 0.3697;  // max hypotheekrenteaftrek tarief
export const FIRE_PCT       = 0.035;   // 3,5% onttrekkingsregel (conservatief NL)
export const JAARRUIMTE_PCT = 0.30;    // 30% van premiegrondslag
export const FRANCHISE      = 17545;   // jaarruimte franchise 2025
export const BOX3_RENDEMENT = 0.0636;  // fictief rendement box 3 2025
export const BOX3_TARIEF    = 0.36;    // belastingtarief over fictief rendement
export const HEFFINGSVRIJ   = 57000;   // heffingsvrij vermogen 2025

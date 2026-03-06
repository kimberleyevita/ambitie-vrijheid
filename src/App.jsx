import { useState } from 'react';
import { C, FONTS } from './tokens.js';
import VrijheidsWizard from './components/VrijheidsWizard.jsx';
import VermogenModule  from './components/VermogenModule.jsx';

const NAV = [
  { id: "wizard",   label: "✦ Vrijheidsplan"          },
  { id: "vermogen", label: "🏛 Vermogen & Belasting"   },
];

export default function App() {
  const [pagina, setPagina] = useState("wizard");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <style>{FONTS}</style>

      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, boxShadow: "0 1px 16px rgba(90,60,20,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.greenLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>
              A
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: C.text }}>
                Ambitie <span style={{ color: C.gold }}>Vrijheid</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Vermogensopbouw voor iedereen
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 10, padding: 4 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPagina(n.id)}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", fontSize: 13, background: pagina === n.id ? C.card : "transparent", color: pagina === n.id ? C.gold : C.muted, fontWeight: pagina === n.id ? 600 : 400, boxShadow: pagina === n.id ? "0 1px 6px rgba(90,60,20,0.08)" : "none" }}>
                {n.label}
              </button>
            ))}
          </nav>

          <div style={{ fontSize: 11, color: C.dim, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em" }}>
            🔒 Alle data lokaal
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 28px 80px" }}>
        {pagina === "wizard"   && <VrijheidsWizard />}
        {pagina === "vermogen" && <VermogenModule  />}
      </main>
    </div>
  );
}

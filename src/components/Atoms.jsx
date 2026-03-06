import { C } from '../tokens.js';
import { eur } from '../utils.js';

export function Card({ children, style, accent }) {
  const s = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 2px 16px rgba(90,60,20,0.06)",
    ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
    ...style,
  };
  return <div style={s}>{children}</div>;
}

export function Kop({ children, size, sub }) {
  return (
    <div style={{ marginBottom: sub ? 6 : 0 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: size || 24, fontWeight: 600, color: C.text, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
        {children}
      </h2>
      {sub && <p style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  );
}

export function Lbl({ children, info }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>
        {children}
      </span>
      {info && (
        <span title={info} style={{ width: 15, height: 15, borderRadius: "50%", background: C.surface, border: `1px solid ${C.border}`, fontSize: 9, color: C.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", flexShrink: 0 }}>
          ?
        </span>
      )}
    </div>
  );
}

export function Inp({ value, onChange, type, prefix, suffix, placeholder, style: extraStyle }) {
  function handleChange(e) {
    if (type === "text") onChange(e.target.value);
    else onChange(parseFloat(e.target.value) || 0);
  }
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span style={{ position: "absolute", left: 12, fontSize: 14, color: C.muted, pointerEvents: "none" }}>
          {prefix}
        </span>
      )}
      <input
        type={type || "number"}
        value={value}
        placeholder={placeholder || ""}
        onChange={handleChange}
        style={{
          width: "100%",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 12px",
          paddingLeft: prefix ? 28 : 12,
          paddingRight: suffix ? 44 : 12,
          fontSize: 15,
          color: C.text,
          fontFamily: "'DM Mono',monospace",
          fontWeight: 500,
          ...extraStyle,
        }}
      />
      {suffix && (
        <span style={{ position: "absolute", right: 12, fontSize: 12, color: C.muted, pointerEvents: "none" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

export function Slider({ value, onChange, min, max, step, label, fmt }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, color: C.gold, fontWeight: 600 }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step || 1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginTop: 4 }}>
        <span>{fmt ? fmt(min) : min}</span>
        <span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>
  );
}

export function Metric({ label, value, sub, accent, info }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />}
      <Lbl info={info}>{label}</Lbl>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, color: accent || C.text, fontWeight: 500, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

export function InfoBox({ children, type }) {
  const t = type || "info";
  const cfg = t === "goed"
    ? { bg: C.greenPale, border: `${C.greenLight}40`, color: C.green, icon: "✓" }
    : t === "let_op"
    ? { bg: C.redPale, border: `${C.red}40`, color: C.red, icon: "⚠" }
    : { bg: C.goldPale, border: `${C.gold}40`, color: C.textSub, icon: "💡" };
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10 }}>
      <span style={{ flexShrink: 0, fontSize: 15 }}>{cfg.icon}</span>
      <p style={{ fontSize: 13, color: cfg.color, lineHeight: 1.65 }}>{children}</p>
    </div>
  );
}

export function BarVoortgang({ value, max, color, label, sub }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.text }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: color || C.gold, fontWeight: 600 }}>
          {eur(value)}
        </span>
      </div>
      <div style={{ background: C.surface, borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color || C.gold, borderRadius: 6, transition: "width 0.5s ease" }} />
      </div>
      {sub && <div style={{ fontSize: 10, color: C.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function StapBtn({ nr, active, done, label, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", background: "transparent", border: "none", width: "100%", textAlign: "left" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: done ? C.greenLight : active ? C.gold : C.surface,
        border: `2px solid ${done ? C.greenLight : active ? C.gold : C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
        color: (done || active) ? "#fff" : C.dim,
      }}>
        {done ? "✓" : nr}
      </div>
      <span style={{ fontSize: 14, color: active ? C.gold : done ? C.greenLight : C.muted, fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
    </button>
  );
}

export function TipTool({ active, payload, label }) {
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

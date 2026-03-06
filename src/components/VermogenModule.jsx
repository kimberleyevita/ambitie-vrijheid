import { useState } from 'react';
import { C } from '../tokens.js';
import { eur } from '../utils.js';
import { Card, Kop, Lbl, Inp, Metric, InfoBox } from './Atoms.jsx';

const EWF_PCT     = 0.0035;
const HRA_PCT     = 0.3697;
const BOX3_REND   = 0.0636;
const BOX3_TAR    = 0.36;

const TYPEN = [
  { id: "sparen",    label: "Spaarrekening" },
  { id: "belegging", label: "Beleggingen" },
  { id: "lijfrente", label: "Lijfrente (vrijgesteld)" },
  { id: "overig",    label: "Overig" },
];

export default function VermogenModule() {
  const [tab, setTab]       = useState("woning");
  const [woning, setWoning] = useState({ woz: 425000, schuld: 280000, rente: 11760, aflVrij: false });
  const [bezit, setBezit]   = useState([
    { id: 1, label: "Beleggingsrekening", waarde: 45000, type: "belegging" },
    { id: 2, label: "Spaarrekening",      waarde: 18500, type: "sparen"    },
    { id: 3, label: "Pensioen lijfrente", waarde: 28000, type: "lijfrente" },
  ]);
  const [nieuw, setNieuw]   = useState({ label: "", waarde: "", type: "sparen" });
  const [partner, setPartner] = useState(false);

  const ewf      = Math.round(woning.woz * EWF_PCT);
  const hra      = Math.round(woning.rente * HRA_PCT);
  const saldo    = ewf - hra;
  const vrijst   = partner ? 114000 : 57000;
  const box3bez  = bezit.filter(b => b.type !== "lijfrente").reduce((s, b) => s + b.waarde, 0);
  const box3gr   = Math.max(0, box3bez - vrijst);
  const box3bel  = Math.round(box3gr * BOX3_REND * BOX3_TAR);

  function addBezit() {
    if (!nieuw.label || !nieuw.waarde) return;
    setBezit(p => [...p, { id: Date.now(), label: nieuw.label, waarde: parseFloat(nieuw.waarde), type: nieuw.type }]);
    setNieuw({ label: "", waarde: "", type: "sparen" });
  }
  function setW(k, v) { setWoning(p => ({ ...p, [k]: v })); }

  const TABS = [["woning", "Eigen Woning"], ["box3", "Box 3"], ["overzicht", "Overzicht"]];

  return (
    <div>
      <Kop size={30} sub="Hoe de belasting jouw vermogen ziet — stap voor stap uitgelegd.">
        Vermogen &amp; Belasting
      </Kop>

      <div style={{ display: "flex", gap: 4, margin: "24px 0 20px", background: C.surface, borderRadius: 12, padding: 4, width: "fit-content" }}>
        {TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 18px", borderRadius: 9, border: "none", fontSize: 13, background: tab === id ? C.card : "transparent", color: tab === id ? C.gold : C.muted, fontWeight: tab === id ? 600 : 400 }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── TAB: WONING ── */}
      {tab === "woning" && (
        <div className="fu">
          <InfoBox>De eigen woning valt in <strong>Box 1</strong>. De belastingdienst rekent een fictief huurvoordeel (eigenwoningforfait) bij je inkomen. Daar staat hypotheekrenteaftrek tegenover.</InfoBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            <Card accent={C.gold}>
              <Kop size={17} sub="Vul de gegevens van je woning in">Jouw woning</Kop>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <Lbl info="WOZ-waarde staat op je gemeentelijke aanslag.">WOZ-waarde</Lbl>
                  <Inp value={woning.woz} onChange={v => setW("woz", v)} prefix="€" />
                </div>
                <div>
                  <Lbl>Hypotheekschuld</Lbl>
                  <Inp value={woning.schuld} onChange={v => setW("schuld", v)} prefix="€" />
                </div>
                <div>
                  <Lbl info="Betaalde rente afgelopen jaar — staat op je jaaropgave.">Betaalde hypotheekrente per jaar</Lbl>
                  <Inp value={woning.rente} onChange={v => setW("rente", v)} prefix="€" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" id="aflvrij" checked={woning.aflVrij}
                    onChange={e => setW("aflVrij", e.target.checked)} />
                  <label htmlFor="aflvrij" style={{ fontSize: 13, color: C.text, cursor: "pointer" }}>
                    Aflossingsvrije hypotheek (voor 2013)
                  </label>
                </div>
                {woning.aflVrij && <InfoBox type="let_op">Controleer of jouw lening nog kwalificeert voor hypotheekrenteaftrek.</InfoBox>}
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card accent={C.gold}>
                <div style={{ fontSize: 10, color: C.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Stap 1</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Eigenwoningforfait</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>0,35% van de WOZ-waarde wordt bij je Box 1 inkomen opgeteld als fictief huurvoordeel.</p>
                <div style={{ background: C.surface, borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{eur(woning.woz)} × 0,35%</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: C.gold, fontWeight: 600 }}>+ {eur(ewf)}</span>
                </div>
              </Card>

              <Card accent={C.greenLight}>
                <div style={{ fontSize: 10, color: C.greenLight, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Stap 2</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Hypotheekrenteaftrek</div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>Betaalde rente aftrekbaar van Box 1 inkomen, maximaal tegen 36,97% tarief.</p>
                <div style={{ background: C.surface, borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{eur(woning.rente)} × 36,97%</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, color: C.greenLight, fontWeight: 600 }}>- {eur(hra)}</span>
                </div>
              </Card>

              <Card accent={saldo > 0 ? C.red : C.greenLight} style={{ background: saldo > 0 ? C.redPale : C.greenPale }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Saldo Box 1 effect</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: saldo > 0 ? C.red : C.greenLight }}>
                  {saldo > 0 ? `+ ${eur(saldo)} bijtelling` : `- ${eur(Math.abs(saldo))} aftrek`}
                </div>
                <div style={{ marginTop: 10 }}>
                  <InfoBox>Let op: de hypotheekschuld mag <strong>niet</strong> worden afgetrokken in Box 3.</InfoBox>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: BOX 3 ── */}
      {tab === "box3" && (
        <div className="fu">
          <InfoBox>Box 3 belast je <strong>spaargeld en beleggingen</strong>. De belastingdienst rekent 6,36% fictief rendement over je vermogen boven de vrijstelling van {eur(vrijst)}. Over dat fictieve rendement betaal je 36%. Lijfrente en eigen woning vallen buiten Box 3.</InfoBox>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            <Card>
              <Kop size={17} sub="Voeg je bezittingen toe">Jouw bezittingen</Kop>
              <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <input value={nieuw.label} onChange={e => setNieuw(p => ({ ...p, label: e.target.value }))} placeholder="Omschrijving"
                  style={{ flex: 2, minWidth: 130, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.text }} />
                <select value={nieuw.type} onChange={e => setNieuw(p => ({ ...p, type: e.target.value }))}
                  style={{ flex: 1, minWidth: 130, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.text }}>
                  {TYPEN.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <input type="number" value={nieuw.waarde} onChange={e => setNieuw(p => ({ ...p, waarde: e.target.value }))} placeholder="Waarde €"
                  style={{ flex: 1, minWidth: 110, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "'DM Mono',monospace", color: C.text }} />
                <button onClick={addBezit}
                  style={{ background: C.gold, border: "none", borderRadius: 9, padding: "9px 16px", color: "#fff", fontWeight: 600, fontSize: 13 }}>
                  + Voeg toe
                </button>
              </div>
              {bezit.map(b => {
                const t = TYPEN.find(x => x.id === b.type);
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t?.label}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: b.type === "lijfrente" ? C.gold : C.greenLight, fontWeight: 600 }}>{eur(b.waarde)}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{b.type === "lijfrente" ? "Vrijgesteld ✓" : "Box 3"}</div>
                    </div>
                    <button onClick={() => setBezit(p => p.filter(x => x.id !== b.id))}
                      style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18, padding: "0 4px" }}>×</button>
                  </div>
                );
              })}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                <input type="checkbox" id="partner" checked={partner} onChange={e => setPartner(e.target.checked)} />
                <label htmlFor="partner" style={{ fontSize: 13, color: C.text, cursor: "pointer" }}>
                  Fiscaal partner — vrijstelling verdubbelt naar €114.000
                </label>
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card accent={C.gold}>
                <Kop size={17}>Box 3 berekening</Kop>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { label: "Totaal bezittingen (excl. lijfrente)", value: eur(box3bez), color: C.text, bold: false },
                    { label: `Heffingsvrij vermogen`, value: `- ${eur(vrijst)}`, color: C.greenLight, bold: false },
                    { label: "Grondslag Box 3", value: eur(box3gr), color: C.gold, bold: true },
                    { label: "Fictief rendement (6,36%)", value: eur(Math.round(box3gr * BOX3_REND)), color: C.muted, bold: false },
                    { label: "Belasting (36% over fictief rendement)", value: eur(box3bel), color: C.red, bold: true },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ fontSize: 13, color: C.muted, flex: 1 }}>{r.label}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: r.color, fontWeight: r.bold ? 700 : 500 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <InfoBox type="goed"><strong>Tip:</strong> Vermogen in een lijfrente of bankspaarproduct is volledig vrijgesteld van Box 3. Dit is een van de meest effectieve manieren om belasting te besparen.</InfoBox>
              {box3bel === 0 && <InfoBox type="goed">Je zit onder de heffingsvrije grens. Je betaalt geen Box 3 belasting.</InfoBox>}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: OVERZICHT ── */}
      {tab === "overzicht" && (
        <div className="fu">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            <Metric label="Eigenwoningforfait" value={eur(ewf)} accent={C.gold} sub="Bijtelling Box 1" />
            <Metric label="Hypotheekrenteaftrek" value={eur(hra)} accent={C.greenLight} sub="Aftrek Box 1" />
            <Metric label="Box 1 effect woning" value={eur(Math.abs(saldo))} accent={saldo > 0 ? C.red : C.greenLight} sub={saldo > 0 ? "Netto bijtelling" : "Netto aftrek"} />
            <Metric label="Box 3 belasting" value={eur(box3bel)} accent={box3bel > 0 ? C.red : C.greenLight} sub="Per jaar" />
          </div>
        </div>
      )}
    </div>
  );
}

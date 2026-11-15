import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { shuffle, sleep, useSingers } from "../../lib/utils.js";

const label = (p) => `${p[0]} & ${p[1]}`;

export default function DuetSequence() {
  const { singers, error } = useSingers();
  const [pairs, setPairs] = useState([]);
  const [first, setFirst] = useState(null);
  const [step, setStep] = useState("select"); // select | review | draw
  const [results, setResults] = useState([]);
  const [ticker, setTicker] = useState("");
  const [running, setRunning] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const inPairs = (n) => pairs.some((p) => p.includes(n));
  const exists = (a, b) => pairs.some((p) => p.includes(a) && p.includes(b));

  function pick(name) {
    if (!first) return setFirst(name);
    if (first === name) return setFirst(null);
    if (!exists(first, name)) setPairs([...pairs, [first, name]]);
    setFirst(null);
  }

  async function runDraw() {
    cancelled.current = false;
    setRunning(true);
    setResults([]);
    const order = shuffle(pairs);
    for (let i = 0; i < order.length; i++) {
      const pool = order.slice(i);
      for (let s = 0; s < 14; s++) {
        if (cancelled.current) return;
        setTicker(label(pool[Math.floor(Math.random() * pool.length)]));
        await sleep(50 + s * s * 3);
      }
      setTicker(label(order[i]));
      await sleep(400);
      setResults((r) => [...r, order[i]]);
      setTicker("");
      await sleep(250);
    }
    setRunning(false);
  }

  const goDraw = () => { setStep("draw"); runDraw(); };
  const goBack = (to) => {
    cancelled.current = true;
    setRunning(false);
    setTicker("");
    setStep(to);
  };
  const done = step === "draw" && !running && results.length === pairs.length;
  const cls = (s) => (step === s ? "step active" : "step");

  return (
    <section>
      <Link to="/" className="back">← Home</Link>
      <h1 className="title">Duet Song Selection</h1>
      <div className="steps">
        <span className={cls("select")}>1 · Select pairs</span>
        <span className={cls("review")}>2 · Review</span>
        <span className={cls("draw")}>3 · Draw</span>
      </div>
      {error && <p className="error">{error}</p>}

      {step === "select" && (
        <>
          <p className="muted">
            {first ? `${first} + … pick a partner` : "Tap two singers to form a pair."}
          </p>
          <div className="chips">
            {singers.map((n) => (
              <button
                key={n}
                className={n === first ? "chip on" : inPairs(n) ? "chip paired" : "chip"}
                onClick={() => pick(n)}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="row">
            <h3 className="sub">Pairs ({pairs.length})</h3>
            {pairs.length > 0 && (
              <button className="link" onClick={() => setPairs([])}>Clear all</button>
            )}
          </div>
          {pairs.length === 0 ? (
            <p className="muted small">No pairs yet.</p>
          ) : (
            <div className="pair-list">
              {pairs.map((p, i) => (
                <span key={i} className="pair-tag">
                  {label(p)}
                  <button onClick={() => setPairs(pairs.filter((_, j) => j !== i))} aria-label="Remove pair">×</button>
                </span>
              ))}
            </div>
          )}
          <button className="primary" disabled={pairs.length < 2} onClick={() => setStep("review")}>
            Show all pairs
          </button>
          {pairs.length < 2 && <p className="muted small">Create at least 2 pairs.</p>}
        </>
      )}

      {step === "review" && (
        <>
          <div className="grid pairs-grid">
            {pairs.map((p, i) => (
              <div key={i} className="card pair-card" style={{ animationDelay: `${i * 70}ms` }}>
                <span>{p[0]}</span>
                <em>&</em>
                <span>{p[1]}</span>
              </div>
            ))}
          </div>
          <div className="row gap" style={{ marginTop: 28 }}>
            <button className="secondary" onClick={() => goBack("select")}>← Edit pairs</button>
            <button className="primary" onClick={goDraw}>Start draw</button>
          </div>
        </>
      )}

      {step === "draw" && (
        <>
          <div className={ticker ? "ticker spin" : "ticker"}>
            {ticker || (running ? "…" : done ? "All set 🎉" : "")}
          </div>
          <ol className="results">
            {results.map((p, i) => (
              <li key={label(p)}>
                <span className="rank">{i + 1}</span>
                <span>{label(p)}</span>
              </li>
            ))}
          </ol>
          <div className="row gap">
            <button className="secondary" onClick={() => goBack("review")}>← Back to pairs</button>
            {done && <button className="primary" onClick={runDraw}>Draw again</button>}
          </div>
        </>
      )}
    </section>
  );
}

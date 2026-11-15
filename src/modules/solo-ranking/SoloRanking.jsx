import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { shuffle, sleep, useSingers } from "../../lib/utils.js";

export default function SoloRanking() {
  const { singers: all, error } = useSingers();
  const [selected, setSelected] = useState(new Set());
  const [step, setStep] = useState("select"); // select | draw
  const [results, setResults] = useState([]);
  const [ticker, setTicker] = useState("");
  const [running, setRunning] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const toggle = (name) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  async function runDraw() {
    cancelled.current = false;
    setRunning(true);
    setResults([]);
    const order = shuffle([...selected]);
    for (let i = 0; i < order.length; i++) {
      const pool = order.slice(i);
      // slot-machine effect: fast cycling that gradually slows down, then lands
      const spins = 14;
      for (let s = 0; s < spins; s++) {
        if (cancelled.current) return;
        setTicker(pool[Math.floor(Math.random() * pool.length)]);
        await sleep(50 + s * s * 3);
      }
      setTicker(order[i]);
      await sleep(350);
      setResults((r) => [...r, order[i]]);
      setTicker("");
      await sleep(250);
    }
    setRunning(false);
  }

  const start = () => {
    setStep("draw");
    runDraw();
  };

  const back = () => {
    cancelled.current = true;
    setRunning(false);
    setTicker("");
    setStep("select");
  };

  const done = step === "draw" && !running && results.length === selected.size;

  return (
    <section>
      <Link to="/" className="back">← Home</Link>
      <h1 className="title">Solo Ranking for Day</h1>

      <div className="steps">
        <span className={step === "select" ? "step active" : "step"}>1 · Select singers</span>
        <span className={step === "draw" ? "step active" : "step"}>2 · Draw</span>
      </div>

      {error && <p className="error">{error}</p>}

      {step === "select" && (
        <>
          <div className="row">
            <span className="muted">{selected.size} of {all.length} selected</span>
            <div className="row gap">
              <button className="link" onClick={() => setSelected(new Set(all))}>Select all</button>
              <button className="link" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          </div>
          <div className="chips">
            {all.map((n) => (
              <button
                key={n}
                className={selected.has(n) ? "chip on" : "chip"}
                onClick={() => toggle(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button className="primary" disabled={selected.size < 2} onClick={start}>
            Start draw
          </button>
          {selected.size < 2 && <p className="muted small">Select at least 2 singers.</p>}
        </>
      )}

      {step === "draw" && (
        <>
          <div className={ticker ? "ticker spin" : "ticker"}>
            {ticker || (running ? "…" : done ? "All set 🎉" : "")}
          </div>
          <ol className="results">
            {results.map((n, i) => (
              <li key={n} style={{ animationDelay: "0ms" }}>
                <span className="rank">{i + 1}</span>
                <span>{n}</span>
              </li>
            ))}
          </ol>
          <div className="row gap">
            <button className="secondary" onClick={back}>← Change singers</button>
            {done && <button className="primary" onClick={runDraw}>Draw again</button>}
          </div>
        </>
      )}
    </section>
  );
}

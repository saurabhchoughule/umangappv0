import { useEffect, useRef, useState } from "react";
import { shuffle, sleep, useSingers } from "../../lib/utils.js";
import { ActionBar, PageHeader, Panel, SingerTile, Stepper } from "../../components/ui.jsx";

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
      for (let s = 0; s < 14; s++) {
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

  const start = () => { setStep("draw"); runDraw(); };
  const back = () => {
    cancelled.current = true;
    setRunning(false);
    setTicker("");
    setStep("select");
  };
  const done = step === "draw" && !running && results.length === selected.size;

  return (
    <>
      <PageHeader icon="🎤" title="Solo Ranking" subtitle="Draw today's solo performance order." />
      <Stepper steps={["Select singers", "Draw"]} current={step === "select" ? 0 : 1} />
      {error && <p className="error">{error}</p>}

      {step === "select" && (
        <>
          <Panel
            title="Singers"
            badge={`${selected.size}/${all.length}`}
            actions={
              <>
                <button className="link" onClick={() => setSelected(new Set(all))}>All</button>
                <button className="link" onClick={() => setSelected(new Set())}>Clear</button>
              </>
            }
          >
            <div className="tiles">
              {all.map((n) => (
                <SingerTile key={n} name={n} state={selected.has(n) ? "on" : ""} onClick={() => toggle(n)} />
              ))}
            </div>
          </Panel>
          <ActionBar info={selected.size < 2 ? "Select at least 2 singers" : `${selected.size} singers ready`}>
            <button className="primary" disabled={selected.size < 2} onClick={start}>Start draw</button>
          </ActionBar>
        </>
      )}

      {step === "draw" && (
        <>
          <div className={ticker ? "stage spin" : "stage"}>
            <span className="stage-label">{running ? "Drawing…" : "Result"}</span>
            <div className="stage-text">{ticker || (running ? "…" : done ? "All set 🎉" : "")}</div>
          </div>
          <Panel title="Order" badge={`${results.length}/${selected.size}`}>
            {results.length === 0 ? (
              <p className="muted small">Waiting for the first pick…</p>
            ) : (
              <ol className="results">
                {results.map((n, i) => (
                  <li key={n} className={i === 0 ? "first" : ""}>
                    <span className="rank">{i + 1}</span>
                    <span className="avatar sm">{n[0]}</span>
                    <span className="r-name">{n}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <ActionBar info={done ? "Draw complete" : "Drawing…"}>
            <button className="secondary" onClick={back}>Change singers</button>
            {done && <button className="primary" onClick={runDraw}>Draw again</button>}
          </ActionBar>
        </>
      )}
    </>
  );
}

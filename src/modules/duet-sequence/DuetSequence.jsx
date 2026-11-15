import { useEffect, useRef, useState } from "react";
import { shuffle, sleep, useSingers } from "../../lib/utils.js";
import { ActionBar, PageHeader, Panel, SingerTile, Stepper } from "../../components/ui.jsx";

const label = (p) => `${p[0]} & ${p[1]}`;

function Duo({ pair }) {
  return (
    <span className="duo">
      <span className="avatar sm">{pair[0][0]}</span>
      <span className="avatar sm b">{pair[1][0]}</span>
    </span>
  );
}

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
  const current = { select: 0, review: 1, draw: 2 }[step];

  return (
    <>
      <PageHeader icon="🎶" title="Duet Song Selection" subtitle="Build duet pairs and draw the singing order." />
      <Stepper steps={["Select pairs", "Review", "Draw"]} current={current} />
      {error && <p className="error">{error}</p>}

      {step === "select" && (
        <>
          <div className="two-col">
            <Panel title="Singers" badge={singers.length}>
              <div className={first ? "hint on" : "hint"}>
                {first ? <>Pick a partner for <b>{first}</b></> : "Tap two singers to form a pair"}
              </div>
              <div className="tiles">
                {singers.map((n) => (
                  <SingerTile
                    key={n}
                    name={n}
                    state={n === first ? "on" : inPairs(n) ? "paired" : ""}
                    onClick={() => pick(n)}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="Pairs"
              badge={pairs.length}
              className="side"
              actions={pairs.length > 0 && <button className="link" onClick={() => setPairs([])}>Clear</button>}
            >
              {pairs.length === 0 ? (
                <p className="muted small">No pairs yet. Your pairs will appear here.</p>
              ) : (
                <ul className="pair-rows">
                  {pairs.map((p, i) => (
                    <li key={i}>
                      <Duo pair={p} />
                      <span className="r-name">{label(p)}</span>
                      <button className="x" aria-label="Remove pair" onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <ActionBar info={pairs.length < 2 ? "Create at least 2 pairs" : `${pairs.length} pairs ready`}>
            <button className="primary" disabled={pairs.length < 2} onClick={() => setStep("review")}>Show all pairs</button>
          </ActionBar>
        </>
      )}

      {step === "review" && (
        <>
          <Panel title="All pairs" badge={pairs.length}>
            <div className="pair-grid">
              {pairs.map((p, i) => (
                <div key={i} className="pair-card" style={{ animationDelay: `${i * 70}ms` }}>
                  <Duo pair={p} />
                  <span className="r-name">{label(p)}</span>
                </div>
              ))}
            </div>
          </Panel>
          <ActionBar info="Ready to draw?">
            <button className="secondary" onClick={() => goBack("select")}>Edit pairs</button>
            <button className="primary" onClick={goDraw}>Start draw</button>
          </ActionBar>
        </>
      )}

      {step === "draw" && (
        <>
          <div className={ticker ? "stage spin" : "stage"}>
            <span className="stage-label">{running ? "Drawing…" : "Result"}</span>
            <div className="stage-text">{ticker || (running ? "…" : done ? "All set 🎉" : "")}</div>
          </div>
          <Panel title="Sequence" badge={`${results.length}/${pairs.length}`}>
            {results.length === 0 ? (
              <p className="muted small">Waiting for the first pick…</p>
            ) : (
              <ol className="results">
                {results.map((p, i) => (
                  <li key={label(p)} className={i === 0 ? "first" : ""}>
                    <span className="rank">{i + 1}</span>
                    <Duo pair={p} />
                    <span className="r-name">{label(p)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <ActionBar info={done ? "Draw complete" : "Drawing…"}>
            <button className="secondary" onClick={() => goBack("review")}>Back to pairs</button>
            {done && <button className="primary" onClick={runDraw}>Draw again</button>}
          </ActionBar>
        </>
      )}
    </>
  );
}

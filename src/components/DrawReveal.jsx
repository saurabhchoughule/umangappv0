import { useEffect, useRef, useState } from "react";
import { sleep } from "../lib/utils.js";
import { Performers } from "./ui.jsx";

// Animates a draw that the server has already decided.
// items: [{ key, label, names }] in final order. `instant` skips the animation.
export default function DrawReveal({ items, instant = false, onDone }) {
  const [shown, setShown] = useState(instant ? items : []);
  const [ticker, setTicker] = useState("");
  const [running, setRunning] = useState(!instant);
  const cancelled = useRef(false);

  useEffect(() => {
    if (instant) return;
    cancelled.current = false;
    (async () => {
      for (let i = 0; i < items.length; i++) {
        const pool = items.slice(i);
        for (let s = 0; s < 14; s++) {
          if (cancelled.current) return;
          setTicker(pool[Math.floor(Math.random() * pool.length)].label);
          await sleep(50 + s * s * 3);
        }
        setTicker(items[i].label);
        await sleep(380);
        if (cancelled.current) return;
        setShown((r) => [...r, items[i]]);
        setTicker("");
        await sleep(250);
      }
      setRunning(false);
      onDone?.();
    })();
    return () => { cancelled.current = true; };
    // runs once per mount; parent changes `key` to replay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={ticker ? "stage spin" : "stage"}>
        <span className="stage-label">{running ? "Drawing…" : "Final order"}</span>
        <div className="stage-text">{ticker || (running ? "…" : "All set 🎉")}</div>
      </div>
      {shown.length > 0 && (
        <ol className="results">
          {shown.map((it, i) => (
            <li key={it.key} className={i === 0 ? "first" : ""}>
              <span className="rank">{i + 1}</span>
              <Performers names={it.names} />
              <span className="r-name">{it.label}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

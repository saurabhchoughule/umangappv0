import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DrawReveal from "../../components/DrawReveal.jsx";
import { ActionBar, PageHeader, Panel, Performers, SingerTile, Stepper } from "../../components/ui.jsx";
import { useSingers } from "../../lib/utils.js";
import { longDate } from "../../lib/format.js";
import EpisodeForm from "./EpisodeForm.jsx";
import SongPicker from "./SongPicker.jsx";

const STEPS = ["Details", "Solo", "Duet", "Go live"];
const label = (p) => p.singers.join(" & ");

// ---- Solo / Duet lineup: select -> server draws -> animated reveal -> confirm ----
function LineupStep({ type, ep, act, onNext }) {
  const isSolo = type === "solo";
  const { singers: master, error: loadError } = useSingers();
  const existing = ep.performances.filter((p) => p.type === type);
  const alreadyDrawn = existing.length > 0 && existing.every((p) => p.position != null);

  const [phase, setPhase] = useState(alreadyDrawn ? "done" : "select"); // select | reveal | done
  const [instant, setInstant] = useState(alreadyDrawn);
  const [drawKey, setDrawKey] = useState(0);
  const [guests, setGuests] = useState(() => [...new Set(existing.flatMap((p) => p.guests))]);
  const [selected, setSelected] = useState(() => new Set(existing.flatMap((p) => p.singers)));
  const [pairs, setPairs] = useState(() => existing.map((p) => p.singers));
  const [first, setFirst] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);

  const everyone = [...master, ...guests];
  const inPairs = (n) => pairs.some((p) => p.includes(n));
  const count = isSolo ? selected.size : pairs.length;

  function pickDuet(name) {
    if (!first) return setFirst(name);
    if (first === name) return setFirst(null);
    if (!pairs.some((p) => p.includes(first) && p.includes(name))) setPairs([...pairs, [first, name]]);
    setFirst(null);
  }
  const toggleSolo = (n) => setSelected((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; });

  function addGuest(e) {
    e.preventDefault();
    const n = guestName.trim().slice(0, 40);
    if (!n) return;
    const found = everyone.find((s) => s.toLowerCase() === n.toLowerCase());
    const name = found ?? n;
    if (!found) setGuests([...guests, n]);
    isSolo ? setSelected((s) => new Set(s).add(name)) : pickDuet(name);
    setGuestName("");
  }

  async function draw(save) {
    setBusy(true);
    if (save) {
      const lineup = isSolo ? everyone.filter((n) => selected.has(n)) : pairs;
      if (!(await act({ action: "save-lineup", id: ep.id, type, lineup }))) return setBusy(false);
    }
    if (await act({ action: "draw", id: ep.id, type })) {
      setInstant(false);
      setDrawKey((k) => k + 1);
      setPhase("reveal");
    }
    setBusy(false);
  }

  async function skipDuets() {
    setBusy(true);
    if (await act({ action: "save-lineup", id: ep.id, type, lineup: [] })) onNext();
    setBusy(false);
  }

  const items = existing
    .filter((p) => p.position != null)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ key: p.id, label: label(p), names: p.singers }));

  if (phase !== "select") {
    return (
      <>
        <DrawReveal key={drawKey} items={items} instant={instant} onDone={() => setPhase("done")} />
        <ActionBar info={phase === "done" ? "Order locked in when you start the session" : "Drawing…"}>
          <button className="secondary" disabled={phase !== "done" || busy} onClick={() => setPhase("select")}>Edit</button>
          <button className="secondary" disabled={phase !== "done" || busy} onClick={() => draw(false)}>Redraw</button>
          <button className="primary" disabled={phase !== "done"} onClick={onNext}>Continue</button>
        </ActionBar>
      </>
    );
  }

  return (
    <>
      {loadError && <p className="alert">{loadError}</p>}
      <div className="two-col">
        <Panel title={isSolo ? "Solo singers" : "Singers"} badge={isSolo ? `${selected.size}/${everyone.length}` : everyone.length}
          actions={isSolo && (
            <>
              <button className="link" onClick={() => setSelected(new Set(everyone))}>All</button>
              <button className="link" onClick={() => setSelected(new Set())}>Clear</button>
            </>
          )}>
          {!isSolo && (
            <div className={first ? "hint on" : "hint"}>
              {first ? <>Pick a partner for <b>{first}</b></> : "Tap two singers to form a duet pair"}
            </div>
          )}
          <div className="tiles">
            {everyone.map((n) => (
              <SingerTile key={n} name={n} guest={guests.includes(n)}
                state={isSolo ? (selected.has(n) ? "on" : "") : n === first ? "on" : inPairs(n) ? "paired" : ""}
                onClick={() => (isSolo ? toggleSolo(n) : pickDuet(n))} />
            ))}
          </div>
          <form className="guest-form" onSubmit={addGuest}>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Add a guest singer…" maxLength={40} />
            <button className="secondary" disabled={!guestName.trim()}>Add</button>
          </form>
        </Panel>

        {!isSolo && (
          <Panel title="Duet pairs" badge={pairs.length} className="side"
            actions={pairs.length > 0 && <button className="link" onClick={() => setPairs([])}>Clear</button>}>
            {pairs.length === 0 ? <p className="muted small">Pairs will appear here.</p> : (
              <ul className="pair-rows">
                {pairs.map((p, i) => (
                  <li key={i}>
                    <Performers names={p} />
                    <span className="r-name">{p.join(" & ")}</span>
                    <button className="x" aria-label="Remove pair" onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <ActionBar info={count < 2 ? `Select at least 2 ${isSolo ? "singers" : "pairs"}` : `${count} ${isSolo ? "singers" : "pairs"} ready`}>
        {!isSolo && <button className="secondary" disabled={busy} onClick={skipDuets}>No duets</button>}
        <button className="primary" disabled={count < 2 || busy} onClick={() => draw(true)}>{busy ? "Saving…" : "Draw order"}</button>
      </ActionBar>
    </>
  );
}

// ---- Songs (optional now, can also be set during the session) + start ----
function GoLiveStep({ ep, songs, addSong, act, onBack }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!window.confirm("Start the session? The lineup and draw will be locked.")) return;
    setBusy(true);
    await act({ action: "start", id: ep.id });
    setBusy(false);
  }

  return (
    <>
      <Panel title="Songs" badge={`${ep.performances.filter((p) => p.song).length}/${ep.performances.length}`}>
        <p className="muted small" style={{ marginBottom: 12 }}>Pick songs now, or later while the session is running.</p>
        <ul className="song-rows">
          {ep.performances.map((p) => (
            <li key={p.id}>
              <Performers names={p.singers} />
              <div className="u-main">
                <div className="u-name">{label(p)}</div>
                <div className="muted small">{p.song ? `${p.song.title}${p.song.originalSinger ? " · " + p.song.originalSinger : ""}` : "No song yet"}</div>
              </div>
              <SongPicker songs={songs} valueId={p.song?.id} onCreate={addSong}
                onPick={(songId) => act({ action: "set-song", performanceId: p.id, songId })}>
                {p.song ? "Change" : "Choose"}
              </SongPicker>
            </li>
          ))}
        </ul>
      </Panel>
      <ActionBar info="Everything ready?">
        <button className="secondary" onClick={onBack}>Back</button>
        <button className="primary" disabled={busy} onClick={start}>Start session</button>
      </ActionBar>
    </>
  );
}

export default function Wizard({ ep, songs, addSong, act, error }) {
  const navigate = useNavigate();
  const solos = ep.performances.filter((p) => p.type === "solo");
  const duets = ep.performances.filter((p) => p.type === "duet");
  const soloDrawn = solos.length > 0 && solos.every((p) => p.position != null);
  const duetDrawn = duets.length > 0 && duets.every((p) => p.position != null);
  const [step, setStep] = useState(!soloDrawn ? 1 : duetDrawn ? 3 : 2);
  const [saving, setSaving] = useState(false);

  async function saveDetails(v) {
    setSaving(true);
    if (await act({ action: "update", id: ep.id, ...v })) setStep(1);
    setSaving(false);
  }
  async function remove() {
    if (!window.confirm("Delete this draft episode? This can't be undone.")) return;
    if (await act({ action: "delete", id: ep.id })) navigate("/episodes", { replace: true });
  }

  return (
    <>
      <PageHeader icon="🎬" title={ep.title} subtitle={`${ep.weekday}, ${longDate(ep.date)} · ${ep.venue}`}
        back={{ to: "/episodes", label: "← Episodes" }} />
      <Stepper steps={STEPS} current={step} />
      {error && <p className="alert">{error}</p>}

      {step === 0 && (
        <Panel title="Episode details">
          <EpisodeForm initial={ep} submitLabel="Save & continue" onSubmit={saveDetails} busy={saving} onCancel={() => setStep(1)} />
        </Panel>
      )}
      {step === 1 && (
        <>
          <button className="link edit-link" onClick={() => setStep(0)}>Edit details</button>
          <LineupStep key="solo" type="solo" ep={ep} act={act} onNext={() => setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <button className="link edit-link" onClick={() => setStep(1)}>← Back to solo</button>
          <LineupStep key="duet" type="duet" ep={ep} act={act} onNext={() => setStep(3)} />
        </>
      )}
      {step === 3 && <GoLiveStep ep={ep} songs={songs} addSong={addSong} act={act} onBack={() => setStep(2)} />}

      <button className="link danger delete-link" onClick={remove}>Delete this draft</button>
    </>
  );
}

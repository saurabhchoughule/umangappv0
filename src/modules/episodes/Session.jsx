import { useState } from "react";
import { PageHeader, Panel, Performers, Pill, Stars } from "../../components/ui.jsx";
import { longDate, plural } from "../../lib/format.js";
import EpisodeForm from "./EpisodeForm.jsx";
import SongPicker from "./SongPicker.jsx";

const names = (p) => p.singers.join(" & ");

function RateInput({ onSubmit }) {
  const [v, setV] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rate-input">
      <div className="rate-btns" role="radiogroup" aria-label="Your rating">
        <button type="button" className={`rb zero${v === 0 ? " on" : ""}`} onClick={() => setV(0)} aria-label="0 stars">0</button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={`rb star${v !== null && n <= v ? " on" : ""}`}
            onClick={() => setV(n)} aria-label={`${n} stars`}>★</button>
        ))}
      </div>
      <button className="primary sm" disabled={v === null || busy}
        onClick={async () => { setBusy(true); await onSubmit(v); setBusy(false); }}>
        {v === null ? "Tap a score" : `Submit ${v} / 5`}
      </button>
      <p className="muted small">One rating per song. It can't be changed after you submit.</p>
    </div>
  );
}

function Result({ r }) {
  if (r.average === null) return <p className="muted small">No ratings were given.</p>;
  return (
    <div className="result">
      <div className="avg"><b>{r.average.toFixed(1)}</b><span>/ 5</span></div>
      <div className="avg-meta">
        <Stars value={r.average} size={20} />
        <div className="muted small">{plural(r.count, "rating")}</div>
      </div>
      <div className="dist">
        {[5, 4, 3, 2, 1, 0].map((n) => (
          <div key={n} className="bar-row">
            <span>{n}</span>
            <div className="bar"><i style={{ width: `${(r.distribution[n] / r.count) * 100}%` }} /></div>
            <span>{r.distribution[n]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingBlock({ p, rate }) {
  const r = p.rating;
  return (
    <div className="rating">
      {r.revealed ? (
        <>
          <div className="rating-label">Final rating</div>
          <Result r={r} />
          {r.mine !== null && <p className="small muted">Your rating: <b>{r.mine}</b> / 5</p>}
        </>
      ) : (
        <>
          {r.mine !== null ? (
            <div className="mine">
              <span>Your rating</span><Stars value={r.mine} /> <b>{r.mine} / 5</b>
            </div>
          ) : r.votingOpen ? (
            <RateInput onSubmit={(v) => rate(p.id, v)} />
          ) : (
            <p className="muted small">Voting is closed.</p>
          )}
          <div className="progress" aria-hidden><i style={{ width: `${r.eligible ? (r.count / r.eligible) * 100 : 0}%` }} /></div>
          <p className="muted small">
            {r.count} of {r.eligible} have rated. The final rating appears when everyone has rated or the host closes voting.
          </p>
        </>
      )}
    </div>
  );
}

function PerformanceCard({ p, ep, isAdmin, songs, addSong, act, rate, upNext }) {
  const live = ep.status === "live";
  const s = p.song;
  return (
    <article className={`perf${upNext ? " next" : ""}${p.performed ? " done" : ""}`}>
      <header className="perf-head">
        <span className="rank">{p.position}</span>
        <Performers names={p.singers} />
        <div className="perf-who">
          <b>{names(p)}</b>
          <span className="muted small">{p.type === "solo" ? "Solo" : "Duet"}{p.guests.length ? " · Guest" : ""}</span>
        </div>
        {p.performed ? <Pill tone="ok">Performed</Pill> : upNext ? <Pill tone="admin">Up next</Pill> : <Pill>Upcoming</Pill>}
      </header>

      <div className="song">
        {s ? (
          <>
            <div className="song-name">{s.title}</div>
            <div className="song-meta">
              {s.originalSinger && <span>Original: {s.originalSinger}</span>}
              {[s.language, s.album, s.year].filter(Boolean).length > 0 && (
                <span>{[s.language, s.album, s.year].filter(Boolean).join(" · ")}</span>
              )}
            </div>
            {s.lyricsUrl && <a className="link" href={s.lyricsUrl} target="_blank" rel="noopener noreferrer">Lyrics ↗</a>}
          </>
        ) : <div className="muted">Song to be announced</div>}
        {isAdmin && (
          <SongPicker songs={songs} valueId={s?.id} onCreate={addSong} className="link"
            onPick={(songId) => act({ action: "set-song", performanceId: p.id, songId })}>
            {s ? "Change song" : "＋ Choose song"}
          </SongPicker>
        )}
      </div>

      {p.performed && <RatingBlock p={p} rate={rate} />}

      {isAdmin && live && (
        <div className="perf-admin">
          {!p.performed ? (
            <button className="primary sm" onClick={() => act({ action: "set-performed", performanceId: p.id, performed: true })}>Mark as performed</button>
          ) : (
            <>
              {!p.rating.revealed && (
                <button className="secondary sm" onClick={() => act({ action: "set-closed", performanceId: p.id, closed: true })}>Close voting & reveal</button>
              )}
              {p.rating.count === 0 && (
                <button className="link" onClick={() => act({ action: "set-performed", performanceId: p.id, performed: false })}>Undo</button>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

export default function Session({ ep, isAdmin, songs, addSong, act, rate, error }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const total = ep.performances.length;
  const done = ep.performances.filter((p) => p.performed).length;
  const nextId = ep.status === "live" ? ep.performances.find((p) => !p.performed)?.id : null;

  async function save(v) {
    setSaving(true);
    if (await act({ action: "update", id: ep.id, ...v })) setEditing(false);
    setSaving(false);
  }
  async function finish() {
    if (window.confirm("Finish this episode? Voting closes and final ratings are revealed.")) act({ action: "complete", id: ep.id });
  }

  const section = (type, title) => {
    const list = ep.performances.filter((p) => p.type === type);
    if (!list.length) return null;
    return (
      <>
        <h2 className="section-label">{title}</h2>
        <div className="perf-grid">
          {list.map((p) => (
            <PerformanceCard key={p.id} p={p} ep={ep} isAdmin={isAdmin} songs={songs} addSong={addSong}
              act={act} rate={rate} upNext={p.id === nextId} />
          ))}
        </div>
      </>
    );
  };

  return (
    <>
      <PageHeader icon="🎬" title={ep.title} subtitle={`${ep.weekday}, ${longDate(ep.date)}`}
        back={{ to: "/episodes", label: "← Episodes" }} />
      {error && <p className="alert">{error}</p>}

      <Panel title="Episode" actions={
        <Pill tone={ep.status === "live" ? "ok" : ""}>{ep.status === "live" ? "● Live" : "Completed"}</Pill>
      }>
        {editing ? (
          <EpisodeForm initial={ep} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(false)} busy={saving} />
        ) : (
          <>
            <dl className="facts">
              <div><dt>Date</dt><dd>{ep.weekday}, {longDate(ep.date)}</dd></div>
              <div><dt>Venue</dt><dd>{ep.venue}</dd></div>
              {ep.theme && <div><dt>Theme</dt><dd>{ep.theme}</dd></div>}
              {ep.remarks && <div className="wide"><dt>Remarks</dt><dd>{ep.remarks}</dd></div>}
            </dl>
            <div className="progress-row">
              <div className="progress"><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
              <span className="muted small">{done}/{total} performed</span>
            </div>
            {isAdmin && (
              <div className="admin-row">
                <button className="link" onClick={() => setEditing(true)}>Edit details</button>
                {ep.status === "live" && (
                  <button className="primary sm" disabled={done < total} onClick={finish}
                    title={done < total ? "Mark every performance as performed first" : ""}>
                    Finish episode
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </Panel>

      {section("solo", "Solo performances")}
      {section("duet", "Duet performances")}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Field from "../../components/Field.jsx";

const meta = (s) => [s.originalSinger, s.language, s.album, s.year].filter(Boolean).join(" · ");
const EMPTY = { title: "", originalSinger: "", language: "", album: "", year: "", lyricsUrl: "" };

// Searchable song chooser: a bottom sheet on phones, a dialog on desktop.
export default function SongPicker({ songs, valueId, onPick, onCreate, className = "secondary", children }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const close = () => { setOpen(false); setAdding(false); setQ(""); setError(""); setForm(EMPTY); };
  const pick = (id) => { onPick(id); close(); };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? songs.filter((s) => `${s.title} ${meta(s)}`.toLowerCase().includes(t)) : songs;
  }, [songs, q]);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try { const song = await onCreate(form); pick(song.id); }
    catch (err) { setError(err.message); }
    setBusy(false);
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && createPortal(
        <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose a song">
            <header className="sheet-head">
              <h3>{adding ? "Add a new song" : "Choose a song"}</h3>
              <button type="button" className="x" aria-label="Close" onClick={close}>×</button>
            </header>

            {!adding ? (
              <>
                <div className="sheet-search">
                  <input autoFocus type="search" placeholder="Search song, singer, movie, language…"
                    value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <ul className="song-list">
                  {shown.map((s) => (
                    <li key={s.id}>
                      <button type="button" className={s.id === valueId ? "song-opt on" : "song-opt"} onClick={() => pick(s.id)}>
                        <span className="song-title">{s.title}</span>
                        <span className="muted small">{meta(s) || "No details"}</span>
                        {s.id === valueId && <span className="tick-on">✓</span>}
                      </button>
                    </li>
                  ))}
                  {shown.length === 0 && (
                    <li className="muted small empty">{songs.length ? "No match. Add it as a new song below." : "No songs yet. Add the first one below."}</li>
                  )}
                </ul>
                <footer className="sheet-foot">
                  {valueId && <button type="button" className="link danger" onClick={() => pick(null)}>Remove song</button>}
                  <button type="button" className="primary" onClick={() => { setAdding(true); setForm({ ...EMPTY, title: q }); }}>＋ Add new song</button>
                </footer>
              </>
            ) : (
              <form className="sheet-form" onSubmit={save}>
                <Field label="Song name" value={form.title} onChange={set("title")} maxLength={120} autoFocus required />
                <Field label="Original singer" value={form.originalSinger} onChange={set("originalSinger")} maxLength={80} />
                <div className="two">
                  <Field label="Language" value={form.language} onChange={set("language")} maxLength={40} placeholder="Hindi" />
                  <Field label="Year / period" value={form.year} onChange={set("year")} maxLength={20} placeholder="1994 or 90s" />
                </div>
                <Field label="Movie / album" value={form.album} onChange={set("album")} maxLength={120} />
                <Field label="Lyrics link" type="url" value={form.lyricsUrl} onChange={set("lyricsUrl")} maxLength={500}
                  placeholder="https://…" hint="Optional. A link keeps things simple and avoids copying copyrighted lyrics." />
                {error && <p className="alert">{error}</p>}
                <div className="form-actions">
                  <button type="button" className="secondary" onClick={() => setAdding(false)}>Back</button>
                  <button className="primary" disabled={busy}>{busy ? "Saving…" : "Save & select"}</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

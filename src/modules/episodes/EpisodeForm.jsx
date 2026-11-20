import { useState } from "react";
import Field from "../../components/Field.jsx";
import { todayISO, weekdayOf } from "../../lib/format.js";

export default function EpisodeForm({ initial, submitLabel, onSubmit, onCancel, busy }) {
  const [v, setV] = useState({
    title: initial?.title ?? "",
    date: initial?.date ?? todayISO(),
    venue: initial?.venue ?? "",
    theme: initial?.theme ?? "",
    remarks: initial?.remarks ?? "",
  });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  return (
    <form className="ep-form" onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <div className="date-row">
        <Field label="Date" type="date" value={v.date} onChange={set("date")} required />
        <span className="weekday">{weekdayOf(v.date) || "—"}</span>
      </div>
      <Field label="Venue" value={v.venue} onChange={set("venue")} placeholder="e.g. Clubhouse hall" maxLength={80} required />
      <Field label="Title" value={v.title} onChange={set("title")} maxLength={80}
        placeholder={initial ? "" : "Auto: Episode 1, 2, 3…"} hint="Optional" />
      <Field label="Theme" value={v.theme} onChange={set("theme")} maxLength={80} placeholder="e.g. 90s romantic hits" hint="Optional" />
      <label className="field wide">
        <span>Remarks</span>
        <textarea rows={3} value={v.remarks} onChange={set("remarks")} maxLength={500}
          placeholder="Anything worth noting: special occasion, guests, rules…" />
      </label>
      <div className="form-actions wide">
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
        <button className="primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}

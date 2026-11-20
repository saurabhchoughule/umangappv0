import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { PageHeader, Pill } from "../../components/ui.jsx";
import { dateParts } from "../../lib/format.js";

const STATUS = { draft: ["Draft", "warn"], live: ["● Live", "ok"], completed: ["Completed", ""] };

export default function EpisodeList() {
  const { user } = useAuth();
  const [episodes, setEpisodes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/episodes").then((d) => setEpisodes(d.episodes)).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader icon="🎬" title="Karaoke Episodes" subtitle="Every session, in one place." />
      {user.role === "admin" && (
        <Link to="/episodes/new" className="primary new-ep">＋ New episode</Link>
      )}
      {error && <p className="alert">{error}</p>}
      {episodes === null && !error && <p className="muted center">Loading…</p>}
      {episodes?.length === 0 && (
        <div className="empty-card">
          <div className="empty-icon">🎬</div>
          <b>No episodes yet</b>
          <p className="muted small">{user.role === "admin" ? "Create the first one to get started." : "Check back once your admin starts a session."}</p>
        </div>
      )}
      <div className="ep-list">
        {episodes?.map((e) => {
          const d = dateParts(e.date);
          const [label, tone] = STATUS[e.status];
          return (
            <Link key={e.id} to={`/episodes/${e.id}`} className="ep-card">
              <div className="date-chip"><b>{d.day}</b><span>{d.mon}</span></div>
              <div className="ep-main">
                <div className="ep-title">{e.title}</div>
                <div className="muted small">{e.weekday} · {e.venue}{e.theme ? ` · ${e.theme}` : ""}</div>
                <div className="muted small">{e.status === "draft" ? "Setting up" : `${e.done}/${e.total} performed`}</div>
              </div>
              <Pill tone={tone}>{label}</Pill>
            </Link>
          );
        })}
      </div>
    </>
  );
}

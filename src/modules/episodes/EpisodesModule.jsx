import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "../../lib/api.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { PageHeader, Panel, Stepper } from "../../components/ui.jsx";
import EpisodeForm from "./EpisodeForm.jsx";
import EpisodeList from "./EpisodeList.jsx";
import EpisodePage from "./EpisodePage.jsx";

function NewEpisode() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user.role !== "admin") return <Navigate to="/episodes" replace />;

  async function create(v) {
    setBusy(true); setError("");
    try {
      const d = await api("/api/episodes", { method: "POST", body: { action: "create", ...v } });
      navigate(`/episodes/${d.episode.id}`, { replace: true });
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <>
      <PageHeader icon="🎬" title="New episode" subtitle="Start with the basics." back={{ to: "/episodes", label: "← Episodes" }} />
      <Stepper steps={["Details", "Solo", "Duet", "Go live"]} current={0} />
      {error && <p className="alert">{error}</p>}
      <Panel title="Episode details">
        <EpisodeForm submitLabel="Create & continue" onSubmit={create} busy={busy} />
      </Panel>
    </>
  );
}

export default function EpisodesModule() {
  return (
    <Routes>
      <Route index element={<EpisodeList />} />
      <Route path="new" element={<NewEpisode />} />
      <Route path=":id" element={<EpisodePage />} />
    </Routes>
  );
}

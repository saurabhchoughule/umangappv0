import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { PageHeader } from "../../components/ui.jsx";
import { useEpisode, useSongs } from "./hooks.js";
import Session from "./Session.jsx";
import Wizard from "./Wizard.jsx";

export default function EpisodePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const { ep, loading, error, act, rate } = useEpisode(id);
  const { songs, addSong } = useSongs();

  if (loading) return <p className="muted center">Loading…</p>;
  if (!ep) {
    return (
      <>
        <PageHeader icon="🎬" title="Episode not found" back={{ to: "/episodes", label: "← Episodes" }} />
        <p className="muted">{error || "It may have been removed, or it isn't available yet."}</p>
      </>
    );
  }
  const props = { ep, songs, addSong, act, error };
  return ep.status === "draft" && isAdmin ? <Wizard {...props} /> : <Session {...props} isAdmin={isAdmin} rate={rate} />;
}

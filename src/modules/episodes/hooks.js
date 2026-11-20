import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";

export function useEpisode(id) {
  const [ep, setEp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/episodes?id=${encodeURIComponent(id)}`);
      setEp(d.episode);
      setError("");
    } catch (e) {
      setError(e.message);
      if (e.status === 404) setEp(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Keep a live session fresh for everyone (no websockets on serverless; polling is enough).
  useEffect(() => {
    if (ep?.status !== "live") return;
    const t = setInterval(() => document.visibilityState === "visible" && load(), 8000);
    return () => clearInterval(t);
  }, [ep?.status, load]);

  // Returns the updated episode, or null (and sets `error`) on failure.
  const act = async (body) => {
    setError("");
    try {
      const d = await api("/api/episodes", { method: "POST", body });
      if (d.episode) setEp(d.episode);
      return d.episode ?? d;
    } catch (e) { setError(e.message); return null; }
  };

  const rate = async (performanceId, score) => {
    setError("");
    try {
      const d = await api("/api/ratings", { method: "POST", body: { performanceId, score } });
      setEp(d.episode);
      return true;
    } catch (e) { setError(e.message); load(); return false; }
  };

  return { ep, loading, error, setError, load, act, rate };
}

export function useSongs() {
  const [songs, setSongs] = useState([]);
  useEffect(() => { api("/api/songs").then((d) => setSongs(d.songs)).catch(() => {}); }, []);
  const addSong = async (values) => {
    const { song } = await api("/api/songs", { method: "POST", body: values });
    setSongs((s) => [...s, song].sort((a, b) => a.title.localeCompare(b.title)));
    return song;
  };
  return { songs, addSong };
}

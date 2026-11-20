import { requireJson, requireUser } from "./_lib/auth.js";
import { exec, query } from "./_lib/db.js";
import { bad, loadEpisode } from "./_lib/episodes.js";

// POST /api/ratings {performanceId, score 0-5}: one rating per user per performance, final.
export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.method !== "POST") return bad(res, "Method not allowed.", 405);
    if (!requireJson(req, res)) return;

    const { performanceId, score } = req.body ?? {};
    if (!Number.isInteger(score) || score < 0 || score > 5) return bad(res, "Rating must be a whole number from 0 to 5.");

    const [p] = await query(
      `SELECT p.id, p.performed, p.closed, p.episode_id, e.status
         FROM performances p JOIN episodes e ON e.id = p.episode_id WHERE p.id = ?`,
      [performanceId]
    );
    if (!p || p.status === "draft") return bad(res, "Performance not found.", 404);
    if (!p.performed) return bad(res, "This performance hasn't happened yet.", 409);
    if (p.closed || p.status !== "live") return bad(res, "Voting is closed for this performance.", 409);

    try {
      await exec("INSERT INTO ratings (performance_id, user_id, score, created_at) VALUES (?,?,?,?)",
        [performanceId, user.id, score, Date.now()]);
    } catch (e) {
      if (String(e.code ?? e.message).includes("CONSTRAINT")) return bad(res, "You've already rated this performance.", 409);
      throw e;
    }
    res.status(200).json({ episode: await loadEpisode(p.episode_id, user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

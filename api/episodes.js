import { requireJson, requireUser } from "./_lib/auth.js";
import { exec, query, tx } from "./_lib/db.js";
import { bad, loadEpisode, parseDetails, parseLineup, shuffle, weekday } from "./_lib/episodes.js";

// GET  /api/episodes           list (non-admins don't see drafts)
// GET  /api/episodes?id=...    one episode with performances + ratings
// POST /api/episodes {action}  admin only: create, update, save-lineup, draw, set-song,
//                              start, set-performed, set-closed, complete, delete
export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const isAdmin = user.role === "admin";

    if (req.method === "GET") {
      if (req.query.id) {
        const ep = await loadEpisode(req.query.id, user);
        if (!ep || (ep.status === "draft" && !isAdmin)) return bad(res, "Episode not found.", 404);
        return res.status(200).json({ episode: ep });
      }
      const rows = await query(
        `SELECT e.id, e.title, e.date, e.venue, e.theme, e.status,
                (SELECT COUNT(*) FROM performances WHERE episode_id = e.id) AS total,
                (SELECT COUNT(*) FROM performances WHERE episode_id = e.id AND performed = 1) AS done
           FROM episodes e ${isAdmin ? "" : "WHERE e.status != 'draft'"}
          ORDER BY e.date DESC, e.created_at DESC`
      );
      return res.status(200).json({ episodes: rows.map((r) => ({ ...r, weekday: weekday(r.date) })) });
    }

    if (req.method !== "POST") return bad(res, "Method not allowed.", 405);
    if (!requireJson(req, res)) return;
    if (!isAdmin) return bad(res, "Admins only.", 403);

    const b = req.body ?? {};
    const now = Date.now();
    const reply = async (id) => res.status(200).json({ episode: await loadEpisode(id, user) });
    const getEp = async (id) => (await query("SELECT * FROM episodes WHERE id = ?", [id]))[0];
    const perfs = (id, type) =>
      query(`SELECT * FROM performances WHERE episode_id = ?${type ? " AND type = ?" : ""}`, type ? [id, type] : [id]);

    if (b.action === "create") {
      const d = parseDetails(b);
      if (d.error) return bad(res, d.error);
      const [{ n }] = await query("SELECT COUNT(*) AS n FROM episodes");
      const id = crypto.randomUUID();
      const v = d.values;
      await exec(
        `INSERT INTO episodes (id, title, date, venue, theme, remarks, status, created_by, created_at, updated_at)
         VALUES (?,?,?,?,?,?, 'draft', ?,?,?)`,
        [id, v.title || `Episode ${Number(n) + 1}`, v.date, v.venue, v.theme, v.remarks, user.id, now, now]
      );
      return reply(id);
    }

    // Performance-level actions
    if (["set-song", "set-performed", "set-closed"].includes(b.action)) {
      const [p] = await query(
        "SELECT p.*, e.status FROM performances p JOIN episodes e ON e.id = p.episode_id WHERE p.id = ?", [b.performanceId]);
      if (!p) return bad(res, "Performance not found.", 404);
      if (b.action === "set-song") {
        if (b.songId) {
          const [s] = await query("SELECT id FROM songs WHERE id = ?", [b.songId]);
          if (!s) return bad(res, "Song not found.", 404);
        }
        await exec("UPDATE performances SET song_id = ? WHERE id = ?", [b.songId || null, p.id]);
      } else {
        if (p.status !== "live") return bad(res, "The session isn't live.", 409);
        if (b.action === "set-performed") {
          const on = b.performed ? 1 : 0;
          if (!on) {
            const [{ n }] = await query("SELECT COUNT(*) AS n FROM ratings WHERE performance_id = ?", [p.id]);
            if (n > 0) return bad(res, "Ratings already exist, so this can't be undone.", 409);
          }
          await exec("UPDATE performances SET performed = ?, closed = 0 WHERE id = ?", [on, p.id]);
        } else {
          if (!p.performed) return bad(res, "Mark it as performed first.", 409);
          await exec("UPDATE performances SET closed = ? WHERE id = ?", [b.closed ? 1 : 0, p.id]);
        }
      }
      await exec("UPDATE episodes SET updated_at = ? WHERE id = ?", [now, p.episode_id]);
      return reply(p.episode_id);
    }

    const ep = await getEp(b.id);
    if (!ep) return bad(res, "Episode not found.", 404);

    switch (b.action) {
      case "update": {
        const d = parseDetails(b);
        if (d.error) return bad(res, d.error);
        const v = d.values;
        await exec("UPDATE episodes SET title=?, date=?, venue=?, theme=?, remarks=?, updated_at=? WHERE id=?",
          [v.title || ep.title, v.date, v.venue, v.theme, v.remarks, now, ep.id]);
        return reply(ep.id);
      }
      case "save-lineup": {
        if (ep.status !== "draft") return bad(res, "The lineup is locked once the session starts.", 409);
        const l = parseLineup(b.type, b.lineup);
        if (l.error) return bad(res, l.error);
        await tx([
          { sql: "DELETE FROM performances WHERE episode_id = ? AND type = ?", args: [ep.id, b.type] },
          ...l.rows.map((names) => ({
            sql: "INSERT INTO performances (id, episode_id, type, singers, created_at) VALUES (?,?,?,?,?)",
            args: [crypto.randomUUID(), ep.id, b.type, JSON.stringify(names), now],
          })),
        ]);
        return reply(ep.id);
      }
      case "draw": {
        if (ep.status !== "draft") return bad(res, "The draw is locked once the session starts.", 409);
        if (!["solo", "duet"].includes(b.type)) return bad(res, "Invalid type.");
        const rows = await perfs(ep.id, b.type);
        if (!rows.length) return bad(res, "Select singers first.");
        await tx(shuffle(rows).map((p, i) => ({ sql: "UPDATE performances SET position = ? WHERE id = ?", args: [i + 1, p.id] })));
        return reply(ep.id);
      }
      case "start": {
        if (ep.status !== "draft") return bad(res, "Already started.", 409);
        const rows = await perfs(ep.id);
        if (!rows.length) return bad(res, "Add at least one performance first.");
        if (rows.some((p) => p.position == null)) return bad(res, "Draw the order for every lineup first.");
        await exec("UPDATE episodes SET status = 'live', updated_at = ? WHERE id = ?", [now, ep.id]);
        return reply(ep.id);
      }
      case "complete": {
        if (ep.status !== "live") return bad(res, "The session isn't live.", 409);
        if ((await perfs(ep.id)).some((p) => !p.performed)) return bad(res, "Mark every performance as performed first.", 409);
        await exec("UPDATE episodes SET status = 'completed', updated_at = ? WHERE id = ?", [now, ep.id]);
        return reply(ep.id);
      }
      case "delete": {
        const ids = (await perfs(ep.id)).map((p) => p.id);
        await tx([
          ...ids.map((pid) => ({ sql: "DELETE FROM ratings WHERE performance_id = ?", args: [pid] })),
          { sql: "DELETE FROM performances WHERE episode_id = ?", args: [ep.id] },
          { sql: "DELETE FROM episodes WHERE id = ?", args: [ep.id] },
        ]);
        return res.status(200).json({ ok: true });
      }
      default:
        return bad(res, "Unknown action.");
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

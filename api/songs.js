import { requireJson, requireUser } from "./_lib/auth.js";
import { exec, query } from "./_lib/db.js";
import { bad, clip } from "./_lib/episodes.js";

const view = (s) => ({
  id: s.id, title: s.title, originalSinger: s.original_singer, language: s.language,
  album: s.album, year: s.year, lyricsUrl: s.lyrics_url,
});

// GET /api/songs (any signed-in user)   POST /api/songs {title, ...} (admin)
export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    if (req.method === "GET") {
      const rows = await query("SELECT * FROM songs ORDER BY title COLLATE NOCASE");
      return res.status(200).json({ songs: rows.map(view) });
    }
    if (req.method !== "POST") return bad(res, "Method not allowed.", 405);
    if (!requireJson(req, res)) return;
    if (user.role !== "admin") return bad(res, "Admins only.", 403);

    const b = req.body ?? {};
    const title = clip(b.title, 120);
    if (!title) return bad(res, "Song name is required.");
    let lyricsUrl = clip(b.lyricsUrl, 500);
    if (lyricsUrl && !/^https?:\/\//i.test(lyricsUrl)) return bad(res, "Lyrics link must start with http:// or https://");
    const song = {
      id: crypto.randomUUID(), title, original_singer: clip(b.originalSinger, 80), language: clip(b.language, 40),
      album: clip(b.album, 120), year: clip(b.year, 20), lyrics_url: lyricsUrl,
    };
    await exec(
      `INSERT INTO songs (id, title, original_singer, language, album, year, lyrics_url, created_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [song.id, song.title, song.original_singer, song.language, song.album, song.year, song.lyrics_url, user.id, Date.now()]
    );
    res.status(200).json({ song: view(song) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

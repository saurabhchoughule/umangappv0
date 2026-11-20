import { randomInt } from "node:crypto";
import { query } from "./db.js";
import { singers as masterSingers } from "../_singers.js";

export const clip = (v, n) => String(v ?? "").trim().slice(0, n);
export const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

export const weekday = (d) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

export function parseDetails(b = {}) {
  const date = String(b.date ?? "").trim();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (!valid) return { error: "Enter a valid date." };
  const venue = clip(b.venue, 80);
  if (!venue) return { error: "Venue is required." };
  return { values: { title: clip(b.title, 80), date, venue, theme: clip(b.theme, 80), remarks: clip(b.remarks, 500) } };
}

// solo: ["Asha", ...]   duet: [["Asha","Ravi"], ...]  ->  rows of singer-name arrays
export function parseLineup(type, lineup) {
  if (!Array.isArray(lineup)) return { error: "Invalid lineup." };
  const name = (s) => clip(s, 40);
  if (type === "solo") {
    const names = lineup.map(name);
    if (names.some((n) => !n)) return { error: "Singer names can't be empty." };
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return { error: "A singer is listed twice." };
    if (names.length > 40) return { error: "Too many singers." };
    return { rows: names.map((n) => [n]) };
  }
  if (type === "duet") {
    const pairs = lineup.map((p) => (Array.isArray(p) ? p.map(name) : []));
    if (pairs.some((p) => p.length !== 2 || !p[0] || !p[1] || p[0].toLowerCase() === p[1].toLowerCase()))
      return { error: "Each duet needs two different singers." };
    const keys = pairs.map((p) => p.map((n) => n.toLowerCase()).sort().join("|"));
    if (new Set(keys).size !== keys.length) return { error: "That duet pair is listed twice." };
    if (pairs.length > 20) return { error: "Too many duet pairs." };
    return { rows: pairs };
  }
  return { error: "Invalid type." };
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const guestsOf = (names) => names.filter((n) => !masterSingers.some((s) => s.toLowerCase() === n.toLowerCase()));

// Full episode view for one signed-in user. Individual scores are never exposed:
// only this user's own score, plus aggregates once the result is revealed.
export async function loadEpisode(id, user) {
  const [ep] = await query("SELECT * FROM episodes WHERE id = ?", [id]);
  if (!ep) return null;

  const perfRows = await query(
    `SELECT p.*, s.title AS s_title, s.original_singer AS s_singer, s.language AS s_lang,
            s.album AS s_album, s.year AS s_year, s.lyrics_url AS s_url
       FROM performances p LEFT JOIN songs s ON s.id = p.song_id
      WHERE p.episode_id = ?
      ORDER BY CASE p.type WHEN 'solo' THEN 0 ELSE 1 END, COALESCE(p.position, 9999), p.created_at`,
    [id]
  );
  const ratingRows = await query(
    `SELECT r.performance_id, r.user_id, r.score FROM ratings r
       JOIN performances p ON p.id = r.performance_id WHERE p.episode_id = ?`,
    [id]
  );
  const [{ n: eligible }] = await query(
    "SELECT COUNT(*) AS n FROM users WHERE active = 1 AND password_hash IS NOT NULL"
  );

  const byPerf = {};
  for (const r of ratingRows) (byPerf[r.performance_id] ??= []).push(r);

  const performances = perfRows.map((p) => {
    const rs = byPerf[p.id] ?? [];
    const revealed = !!p.performed && (!!p.closed || ep.status === "completed" || (eligible > 0 && rs.length >= eligible));
    const dist = [0, 0, 0, 0, 0, 0];
    rs.forEach((r) => dist[r.score]++);
    const mine = rs.find((r) => r.user_id === user.id);
    const singers = JSON.parse(p.singers);
    return {
      id: p.id, type: p.type, singers, guests: guestsOf(singers), position: p.position,
      performed: !!p.performed, closed: !!p.closed,
      song: p.song_id && {
        id: p.song_id, title: p.s_title, originalSinger: p.s_singer, language: p.s_lang,
        album: p.s_album, year: p.s_year, lyricsUrl: p.s_url,
      },
      rating: {
        count: rs.length, eligible, mine: mine ? mine.score : null, revealed,
        votingOpen: !!p.performed && !p.closed && ep.status === "live",
        average: revealed && rs.length ? Math.round((rs.reduce((a, r) => a + r.score, 0) / rs.length) * 10) / 10 : null,
        distribution: revealed ? dist : null,
      },
    };
  });

  return {
    id: ep.id, title: ep.title, date: ep.date, weekday: weekday(ep.date), venue: ep.venue,
    theme: ep.theme, remarks: ep.remarks, status: ep.status, performances,
  };
}

import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";

// Local: file:data/app.db (SQLite). Production: a Turso/libSQL URL via env.
let client;
let ready;

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL || "file:data/app.db";
    if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
    client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','user')),
    password_hash TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    invite_hash TEXT,
    invite_expires INTEGER,
    token_version INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_singer TEXT,
    language TEXT,
    album TEXT,
    year TEXT,
    lyrics_url TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    venue TEXT NOT NULL,
    theme TEXT,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','completed')),
    created_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS performances (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('solo','duet')),
    singers TEXT NOT NULL,
    position INTEGER,
    song_id TEXT,
    performed INTEGER NOT NULL DEFAULT 0,
    closed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_perf_episode ON performances(episode_id)`,
  // One rating per user per performance, enforced by the primary key.
  `CREATE TABLE IF NOT EXISTS ratings (
    performance_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 5),
    created_at INTEGER NOT NULL,
    PRIMARY KEY (performance_id, user_id)
  )`,
];

async function db() {
  const c = getClient();
  ready ??= c.batch(SCHEMA, "write");
  await ready;
  return c;
}

// Generic helpers for modules beyond users.
export async function query(sql, args = []) {
  const r = await (await db()).execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((col, i) => [col, row[i]])));
}
export const exec = async (sql, args = []) => (await db()).execute({ sql, args });
export const tx = async (statements) => (await db()).batch(statements, "write");

const toUser = (r) =>
  r && {
    id: r.id, username: r.username, name: r.name, role: r.role,
    password_hash: r.password_hash, active: !!r.active,
    invite_hash: r.invite_hash, invite_expires: r.invite_expires,
    token_version: Number(r.token_version),
    failed_attempts: Number(r.failed_attempts), locked_until: Number(r.locked_until),
    created_at: Number(r.created_at),
  };

const first = async (sql, args) => toUser((await (await db()).execute({ sql, args })).rows[0]);

export const countUsers = async () =>
  Number((await (await db()).execute("SELECT COUNT(*) AS n FROM users")).rows[0].n);
export const getUserById = (id) => first("SELECT * FROM users WHERE id = ?", [id]);
export const getUserByUsername = (u) => first("SELECT * FROM users WHERE username = ?", [u]);
export const getUserByInviteHash = (h) => first("SELECT * FROM users WHERE invite_hash = ?", [h]);
export const listUsers = async () =>
  (await (await db()).execute("SELECT * FROM users ORDER BY created_at")).rows.map(toUser);

export async function insertUser(u) {
  await (await db()).execute({
    sql: `INSERT INTO users (id, username, name, role, password_hash, invite_hash, invite_expires, created_at)
          VALUES (?,?,?,?,?,?,?,?)`,
    args: [u.id, u.username, u.name, u.role, u.password_hash ?? null, u.invite_hash ?? null, u.invite_expires ?? null, Date.now()],
  });
}

const COLUMNS = new Set([
  "name", "role", "password_hash", "active", "invite_hash", "invite_expires",
  "token_version", "failed_attempts", "locked_until",
]);
export async function updateUser(id, patch) {
  const keys = Object.keys(patch).filter((k) => COLUMNS.has(k));
  if (!keys.length) return;
  await (await db()).execute({
    sql: `UPDATE users SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`,
    args: [...keys.map((k) => (typeof patch[k] === "boolean" ? +patch[k] : patch[k])), id],
  });
}

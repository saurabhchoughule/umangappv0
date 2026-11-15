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

async function db() {
  const c = getClient();
  ready ??= c.execute(`
    CREATE TABLE IF NOT EXISTS users (
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
    )`);
  await ready;
  return c;
}

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

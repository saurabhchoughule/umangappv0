import { hash, verify } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getUserById } from "./db.js";

const COOKIE = "umang_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

// ---- Passwords: Argon2id (OWASP defaults: m=19 MiB, t=2, p=1) ----
export const hashPassword = (pw) => hash(pw);
export const verifyPassword = (h, pw) => verify(h, pw).catch(() => false);

let dummy;
export async function burnTime(pw) {
  // Verify against a dummy hash so unknown users cost the same as real ones.
  dummy ??= await hashPassword("dummy-password-for-timing");
  await verifyPassword(dummy, pw);
}

export function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 10) return "Password must be at least 10 characters.";
  if (pw.length > 128) return "Password must be at most 128 characters.";
  return null;
}

// ---- One-time invite tokens (only the SHA-256 hash is stored) ----
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
export function newInvite() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token), expires: Date.now() + INVITE_TTL_MS };
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---- Sessions: signed JWT in an httpOnly cookie ----
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars).");
  return new TextEncoder().encode(s);
}

const cookieAttrs = () =>
  `Path=/; HttpOnly; SameSite=Lax${process.env.VERCEL ? "; Secure" : ""}`;

export async function startSession(res, user) {
  const jwt = await new SignJWT({ tv: user.token_version, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret());
  res.setHeader("Set-Cookie", `${COOKIE}=${jwt}; Max-Age=${SESSION_SECONDS}; ${cookieAttrs()}`);
}
export const endSession = (res) =>
  res.setHeader("Set-Cookie", `${COOKIE}=; Max-Age=0; ${cookieAttrs()}`);

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k)
  );
}

export async function getSessionUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const u = await getUserById(payload.sub);
    // Re-checked on every request so disabling a user takes effect immediately.
    if (!u || !u.active || !u.password_hash || u.token_version !== payload.tv) return null;
    return u;
  } catch {
    return null;
  }
}

export const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role });

export async function requireUser(req, res, { admin = false } = {}) {
  const u = await getSessionUser(req);
  if (!u) { res.status(401).json({ error: "Not signed in." }); return null; }
  if (admin && u.role !== "admin") { res.status(403).json({ error: "Admins only." }); return null; }
  return u;
}

// Cheap CSRF defence on top of SameSite=Lax: mutating calls must be JSON.
export function requireJson(req, res) {
  if (!(req.headers["content-type"] || "").includes("application/json")) {
    res.status(415).json({ error: "JSON required." });
    return false;
  }
  return true;
}

export const cleanUsername = (u) => String(u ?? "").trim().toLowerCase();
export const validUsername = (u) => /^[a-z0-9._-]{3,32}$/.test(u);

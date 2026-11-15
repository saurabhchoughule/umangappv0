import {
  burnTime, cleanUsername, endSession, getSessionUser, hashPassword, publicUser,
  requireJson, safeEqual, sha256, startSession, validatePassword, validUsername, verifyPassword,
} from "./_lib/auth.js";
import {
  countUsers, getUserByInviteHash, getUserByUsername, insertUser, updateUser,
} from "./_lib/db.js";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

// POST /api/auth?action=login|logout|bootstrap|set-password
// GET  /api/auth?action=me|invite-info
export default async function handler(req, res) {
  try {
    const action = req.query.action;
    if (req.method === "GET" && action === "me") return me(req, res);
    if (req.method === "GET" && action === "invite-info") return inviteInfo(req, res);
    if (req.method === "POST") {
      if (!requireJson(req, res)) return;
      if (action === "login") return login(req, res);
      if (action === "logout") { endSession(res); return res.status(200).json({ ok: true }); }
      if (action === "bootstrap") return bootstrap(req, res);
      if (action === "set-password") return setPassword(req, res);
    }
    res.status(404).json({ error: "Not found." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

async function me(req, res) {
  const u = await getSessionUser(req);
  res.status(200).json({ user: u ? publicUser(u) : null, needsSetup: !u && (await countUsers()) === 0 });
}

async function login(req, res) {
  const username = cleanUsername(req.body?.username);
  const password = String(req.body?.password ?? "");
  const u = await getUserByUsername(username);
  const generic = () => res.status(401).json({ error: "Invalid username or password." });

  if (!u || !u.password_hash || !u.active) { await burnTime(password); return generic(); }
  if (u.locked_until > Date.now()) {
    return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  }
  if (!(await verifyPassword(u.password_hash, password))) {
    const attempts = u.failed_attempts + 1;
    await updateUser(u.id, attempts >= MAX_ATTEMPTS
      ? { failed_attempts: 0, locked_until: Date.now() + LOCK_MS }
      : { failed_attempts: attempts });
    return generic();
  }
  await updateUser(u.id, { failed_attempts: 0, locked_until: 0 });
  await startSession(res, u);
  res.status(200).json({ user: publicUser(u) });
}

// First-run only: creates the very first admin. Needs ADMIN_SETUP_KEY from the server env.
async function bootstrap(req, res) {
  const key = process.env.ADMIN_SETUP_KEY;
  if ((await countUsers()) > 0 || !key) return res.status(403).json({ error: "Setup is not available." });
  const { setupKey, name, password } = req.body ?? {};
  const username = cleanUsername(req.body?.username);
  if (!safeEqual(setupKey ?? "", key)) return res.status(403).json({ error: "Invalid setup key." });
  if (!String(name ?? "").trim()) return res.status(400).json({ error: "Name is required." });
  if (!validUsername(username)) return res.status(400).json({ error: "Username: 3-32 chars (a-z, 0-9, . _ -)." });
  const bad = validatePassword(password);
  if (bad) return res.status(400).json({ error: bad });

  const user = { id: crypto.randomUUID(), username, name: String(name).trim(), role: "admin", password_hash: await hashPassword(password) };
  await insertUser(user);
  await startSession(res, { ...user, token_version: 0 });
  res.status(200).json({ user: publicUser(user) });
}

async function findInvite(token) {
  if (typeof token !== "string" || !token) return null;
  const u = await getUserByInviteHash(sha256(token));
  return u && u.active && u.invite_expires > Date.now() ? u : null;
}

async function inviteInfo(req, res) {
  const u = await findInvite(req.query.token);
  if (!u) return res.status(404).json({ error: "This link is invalid or has expired." });
  res.status(200).json({ name: u.name, username: u.username });
}

async function setPassword(req, res) {
  const u = await findInvite(req.body?.token);
  if (!u) return res.status(400).json({ error: "This link is invalid or has expired." });
  const bad = validatePassword(req.body?.password);
  if (bad) return res.status(400).json({ error: bad });

  const updated = {
    password_hash: await hashPassword(req.body.password),
    invite_hash: null, invite_expires: null,
    token_version: u.token_version + 1, // signs out any older sessions
    failed_attempts: 0, locked_until: 0,
  };
  await updateUser(u.id, updated);
  await startSession(res, { ...u, token_version: updated.token_version });
  res.status(200).json({ user: publicUser(u) });
}

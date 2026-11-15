import {
  cleanUsername, newInvite, requireJson, requireUser, validUsername,
} from "./_lib/auth.js";
import { getUserById, getUserByUsername, insertUser, listUsers, updateUser } from "./_lib/db.js";

const view = (u) => ({
  id: u.id, username: u.username, name: u.name, role: u.role, active: u.active,
  pending: !u.password_hash, created_at: u.created_at,
  inviteExpired: !!u.invite_hash && u.invite_expires < Date.now(),
});

// Admin only. GET /api/users, POST /api/users {action: create|reissue|set-active|set-role}
export default async function handler(req, res) {
  try {
    const admin = await requireUser(req, res, { admin: true });
    if (!admin) return;

    if (req.method === "GET") return res.status(200).json({ users: (await listUsers()).map(view) });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    if (!requireJson(req, res)) return;

    const { action, id } = req.body ?? {};

    if (action === "create") {
      const username = cleanUsername(req.body.username);
      const name = String(req.body.name ?? "").trim();
      const role = req.body.role === "admin" ? "admin" : "user";
      if (!name) return res.status(400).json({ error: "Name is required." });
      if (!validUsername(username)) return res.status(400).json({ error: "Username: 3-32 chars (a-z, 0-9, . _ -)." });
      if (await getUserByUsername(username)) return res.status(409).json({ error: "Username already exists." });
      const invite = newInvite();
      const user = { id: crypto.randomUUID(), username, name, role, invite_hash: invite.hash, invite_expires: invite.expires };
      await insertUser(user);
      return res.status(200).json({ user: view(await getUserById(user.id)), inviteToken: invite.token });
    }

    const target = await getUserById(id);
    if (!target) return res.status(404).json({ error: "User not found." });
    const self = target.id === admin.id;

    if (action === "reissue") {
      const invite = newInvite();
      await updateUser(id, { invite_hash: invite.hash, invite_expires: invite.expires });
      return res.status(200).json({ user: view(await getUserById(id)), inviteToken: invite.token });
    }
    if (action === "set-active") {
      if (self) return res.status(400).json({ error: "You can't disable your own account." });
      await updateUser(id, { active: !!req.body.active, token_version: target.token_version + 1 });
      return res.status(200).json({ user: view(await getUserById(id)) });
    }
    if (action === "set-role") {
      if (self) return res.status(400).json({ error: "You can't change your own role." });
      await updateUser(id, { role: req.body.role === "admin" ? "admin" : "user", token_version: target.token_version + 1 });
      return res.status(200).json({ user: view(await getUserById(id)) });
    }
    res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

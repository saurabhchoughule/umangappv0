import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { PageHeader, Panel } from "../../components/ui.jsx";
import Field from "../../components/Field.jsx";

const statusOf = (u) =>
  !u.active ? ["Disabled", "off"] : u.pending ? [u.inviteExpired ? "Invite expired" : "Invite pending", "warn"] : ["Active", "ok"];

export default function UserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", username: "", role: "user" });
  const [invite, setInvite] = useState(null); // { name, link }
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api("/api/users").then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const link = (t) => `${window.location.origin}/set-password?token=${t}`;
  const call = (body) => api("/api/users", { method: "POST", body });

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError(""); setCopied(false);
    try {
      const d = await call({ action: "create", ...form });
      setInvite({ name: d.user.name, link: link(d.inviteToken) });
      setForm({ name: "", username: "", role: "user" });
      load();
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  async function act(body, after) {
    setError(""); setCopied(false);
    try { const d = await call(body); after?.(d); load(); }
    catch (err) { setError(err.message); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(invite.link); setCopied(true); } catch { /* ignore */ }
  }

  return (
    <>
      <PageHeader icon="👥" title="User Management" subtitle="Add users and manage who can sign in." />
      {error && <p className="alert">{error}</p>}

      <Panel title="Add user">
        <form className="form-grid" onSubmit={create}>
          <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Field label="Username" value={form.username} autoCapitalize="none"
            onChange={(e) => setForm({ ...form, username: e.target.value })} hint="a-z, 0-9, . _ -" required />
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
        </form>

        {invite && (
          <div className="invite">
            <b>Setup link for {invite.name}</b>
            <p className="small muted">Share this link privately. They'll use it to choose their own password. It works once and expires in 48 hours. It won't be shown again.</p>
            <div className="copy-row">
              <input readOnly value={invite.link} onFocus={(e) => e.target.select()} />
              <button type="button" className="secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Users" badge={users.length}>
        <ul className="user-rows">
          {users.map((u) => {
            const [label, tone] = statusOf(u);
            const self = u.id === me.id;
            return (
              <li key={u.id}>
                <span className="avatar">{u.name[0]}</span>
                <div className="u-main">
                  <div className="u-name">{u.name} {self && <span className="muted small">(you)</span>}</div>
                  <div className="muted small">@{u.username}</div>
                </div>
                <div className="u-tags">
                  <span className={`pill ${u.role === "admin" ? "admin" : ""}`}>{u.role}</span>
                  <span className={`pill ${tone}`}>{label}</span>
                </div>
                {!self && (
                  <div className="u-actions">
                    <button className="link" onClick={() =>
                      act({ action: "reissue", id: u.id }, (d) => setInvite({ name: u.name, link: link(d.inviteToken) }))}>
                      {u.pending ? "New link" : "Reset password"}
                    </button>
                    <button className="link" onClick={() =>
                      act({ action: "set-role", id: u.id, role: u.role === "admin" ? "user" : "admin" })}>
                      Make {u.role === "admin" ? "user" : "admin"}
                    </button>
                    <button className="link danger" onClick={() => act({ action: "set-active", id: u.id, active: !u.active })}>
                      {u.active ? "Disable" : "Enable"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

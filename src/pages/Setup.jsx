import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../lib/api.js";
import Field from "../components/Field.jsx";

export default function Setup() {
  const { needsSetup, adopt } = useAuth();
  const [f, setF] = useState({ setupKey: "", name: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!needsSetup) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    if (f.password !== f.confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const { user } = await api("/api/auth?action=bootstrap", { method: "POST", body: f });
      adopt(user);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="auth-head">
          <span className="logo big">♪</span>
          <h1>Create admin account</h1>
          <p className="muted">One-time setup. You'll need the setup key from the server's <code>.env</code>.</p>
        </div>
        <Field label="Setup key" value={f.setupKey} onChange={set("setupKey")} autoComplete="off" required />
        <Field label="Your name" value={f.name} onChange={set("name")} required />
        <Field label="Username" value={f.username} onChange={set("username")} autoCapitalize="none"
          hint="3-32 characters: a-z, 0-9, . _ -" required />
        <Field label="Password" type="password" value={f.password} onChange={set("password")}
          autoComplete="new-password" hint="At least 10 characters" required />
        <Field label="Confirm password" type="password" value={f.confirm} onChange={set("confirm")}
          autoComplete="new-password" required />
        {error && <p className="alert">{error}</p>}
        <button className="primary block" disabled={busy}>{busy ? "Creating…" : "Create admin"}</button>
        <p className="small center"><Link to="/" className="link">Back to sign in</Link></p>
      </form>
    </div>
  );
}

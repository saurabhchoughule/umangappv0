import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Field from "../components/Field.jsx";

export default function Login() {
  const { login, needsSetup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { await login(username, password); }
    catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="auth-head">
          <span className="logo big">♪</span>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to Umang Karaoke</p>
        </div>
        <Field label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
          autoComplete="username" autoCapitalize="none" autoFocus required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" required />
        {error && <p className="alert">{error}</p>}
        <button className="primary block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {needsSetup && (
          <p className="small muted center">First time here? <Link to="/setup" className="link">Create the admin account</Link></p>
        )}
        <p className="small muted center">New user? Ask your admin for a setup link.</p>
      </form>
    </div>
  );
}

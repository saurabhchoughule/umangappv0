import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../lib/api.js";
import Field from "../components/Field.jsx";

export default function SetPassword() {
  const token = useSearchParams()[0].get("token") || "";
  const { adopt } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/auth?action=invite-info&token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch(() => setInvalid(true));
  }, [token]);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    try {
      const { user } = await api("/api/auth?action=set-password", { method: "POST", body: { token, password } });
      adopt(user);
      navigate("/", { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <form className="panel auth-card" onSubmit={submit}>
        <div className="auth-head">
          <span className="logo big">♪</span>
          <h1>Set your password</h1>
          {info && <p className="muted">Hi {info.name}, choose a password for <b>{info.username}</b>.</p>}
        </div>
        {invalid ? (
          <p className="alert">This link is invalid or has expired. Ask your admin for a new one.</p>
        ) : !info ? (
          <p className="muted center">Checking link…</p>
        ) : (
          <>
            <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password" hint="At least 10 characters. A short phrase works well." autoFocus required />
            <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password" required />
            {error && <p className="alert">{error}</p>}
            <button className="primary block" disabled={busy}>{busy ? "Saving…" : "Save password & sign in"}</button>
          </>
        )}
      </form>
    </div>
  );
}

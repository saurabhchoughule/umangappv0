import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Setup from "./pages/Setup.jsx";
import SetPassword from "./pages/SetPassword.jsx";
import { modules } from "./modules/registry.js";

export default function App() {
  const { user, loading, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <span className="logo">♪</span> Umang<span className="dot-accent">.</span>
          </Link>
          {user ? (
            <div className="user-chip">
              <span className="who">
                {user.name}
                {user.role === "admin" && <span className="pill admin">admin</span>}
              </span>
              <button className="link" onClick={logout}>Sign out</button>
            </div>
          ) : (
            <span className="tag">Karaoke Group</span>
          )}
        </div>
      </header>
      <main className="container">
        {loading ? (
          <p className="muted center">Loading…</p>
        ) : (
          <Routes>
            <Route path="/set-password" element={<SetPassword />} />
            {!user ? (
              <>
                <Route path="/setup" element={<Setup />} />
                <Route path="*" element={<Login />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Home />} />
                {modules.map((m) => (
                  <Route
                    key={m.id}
                    path={m.routePath || m.path}
                    element={m.adminOnly && user.role !== "admin" ? <Navigate to="/" replace /> : <m.component />}
                  />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        )}
      </main>
    </div>
  );
}

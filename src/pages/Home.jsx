import { Link } from "react-router-dom";
import { modules } from "../modules/registry.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  const visible = modules.filter((m) => !m.adminOnly || user.role === "admin");
  return (
    <>
      <section className="hero">
        <h1>Hi {user.name.split(" ")[0]},<br />karaoke night, sorted.</h1>
        <p>Pick a module below to run today's session.</p>
      </section>
      <h2 className="section-label">Modules</h2>
      <div className="module-grid">
        {visible.map((m) => (
          <Link key={m.id} to={m.path} className="module-card">
            <span className="module-icon">{m.icon}</span>
            <div className="module-text">
              <h3>{m.name}</h3>
              <p>{m.description}</p>
            </div>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>
    </>
  );
}

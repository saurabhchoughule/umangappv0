import { Link } from "react-router-dom";
import { modules } from "../modules/registry.js";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Karaoke night,<br />sorted.</h1>
        <p>Pick a module below to run today's session.</p>
      </section>
      <h2 className="section-label">Modules</h2>
      <div className="module-grid">
        {modules.map((m) => (
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

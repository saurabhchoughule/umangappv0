import { Link } from "react-router-dom";
import { modules } from "../modules/registry.js";

export default function Home() {
  return (
    <section>
      <h1 className="title">Welcome</h1>
      <p className="muted">Choose a module to get started.</p>
      <div className="grid">
        {modules.map((m) => (
          <Link key={m.id} to={m.path} className="card module-card">
            <div className="icon">{m.icon}</div>
            <h3>{m.name}</h3>
            <p className="muted">{m.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";

export function PageHeader({ icon, title, subtitle }) {
  return (
    <div className="page-header">
      <Link to="/" className="back">← Home</Link>
      <div className="page-title">
        <span className="page-icon">{icon}</span>
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function Stepper({ steps, current }) {
  return (
    <ol className="stepper">
      {steps.map((label, i) => (
        <li key={label} className={i === current ? "active" : i < current ? "done" : ""}>
          <span className="dot">{i < current ? "✓" : i + 1}</span>
          <span className="label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function Panel({ title, badge, actions, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          <h2>
            {title}
            {badge !== undefined && <span className="badge">{badge}</span>}
          </h2>
          <div className="panel-actions">{actions}</div>
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function ActionBar({ info, children }) {
  return (
    <div className="action-bar">
      <div className="action-info">{info}</div>
      <div className="action-btns">{children}</div>
    </div>
  );
}

export function SingerTile({ name, state, onClick }) {
  // state: "" | "on" | "paired"
  return (
    <button className={`tile ${state || ""}`} onClick={onClick}>
      <span className="avatar">{name[0]}</span>
      <span className="tile-name">{name}</span>
      <span className="tick">{state === "on" ? "✓" : ""}</span>
    </button>
  );
}

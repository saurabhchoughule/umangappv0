import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import { modules } from "./modules/registry.js";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">Umang<span>.</span></Link>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          {modules.map((m) => (
            <Route key={m.id} path={m.path} element={<m.component />} />
          ))}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

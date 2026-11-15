import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Runs the Vercel-style handlers in /api locally, so dev matches production.
function localApi() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/api/")) return next();
        const url = new URL(req.url, "http://localhost");
        const name = url.pathname.slice(5);
        if (!/^[a-z-]+$/.test(name)) return next();

        let handler;
        try {
          handler = (await server.ssrLoadModule(`/api/${name}.js`)).default;
        } catch {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Not found." }));
        }

        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString();
        req.query = Object.fromEntries(url.searchParams);
        try { req.body = raw && (req.headers["content-type"] || "").includes("json") ? JSON.parse(raw) : raw; }
        catch { req.body = undefined; }
        res.status = (c) => { res.statusCode = c; return res; };
        res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
        try { await handler(req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end("{}"); }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) process.env[k] ??= v;
  return {
    plugins: [react(), localApi()],
    server: { port: 5173, host: true, watch: { ignored: ["**/data/**"] } },
  };
});

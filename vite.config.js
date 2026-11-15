import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { singers } from "./api/_singers.js";

// Serves /api/singers locally using the same data as the Vercel function.
const localApi = {
  name: "local-api",
  configureServer(server) {
    server.middlewares.use("/api/singers", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ singers }));
    });
  },
};

export default defineConfig({
  plugins: [react(), localApi],
  server: { port: 5173, host: true },
});

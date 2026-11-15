import { requireUser } from "./_lib/auth.js";
import { singers } from "./_singers.js";

// Vercel serverless function: GET /api/singers (signed-in users only)
export default async function handler(req, res) {
  try {
    if (!(await requireUser(req, res))) return;
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json({ singers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error." });
  }
}

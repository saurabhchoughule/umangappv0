import { singers } from "./_singers.js";

// Vercel serverless function: GET /api/singers
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=60");
  res.status(200).json({ singers });
}

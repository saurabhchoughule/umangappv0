import SoloRanking from "./solo-ranking/SoloRanking.jsx";

// Add new modules here; the home page renders them automatically.
export const modules = [
  {
    id: "solo-ranking",
    path: "/solo-ranking",
    name: "Solo Ranking for Day",
    description: "Pick singers and draw today's solo order.",
    icon: "🎤",
    component: SoloRanking,
  },
];

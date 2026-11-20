import EpisodesModule from "./episodes/EpisodesModule.jsx";
import SoloRanking from "./solo-ranking/SoloRanking.jsx";
import DuetSequence from "./duet-sequence/DuetSequence.jsx";
import UserManagement from "./user-management/UserManagement.jsx";

// Add new modules here; the home page renders them automatically.
// adminOnly: true hides a module (and blocks its route) for non-admin users.
export const modules = [
  {
    id: "episodes",
    path: "/episodes",
    routePath: "/episodes/*", // module handles its own sub-pages
    name: "Karaoke Episodes",
    description: "Run a session: lineup, draw, songs and ratings.",
    icon: "🎬",
    component: EpisodesModule,
  },
  {
    id: "solo-ranking",
    path: "/solo-ranking",
    name: "Solo Ranking for Day",
    description: "Pick singers and draw today's solo order.",
    icon: "🎤",
    component: SoloRanking,
  },
  {
    id: "duet-sequence",
    path: "/duet-sequence",
    name: "Duet Song Selection",
    description: "Build duet pairs and draw the singing order.",
    icon: "🎶",
    component: DuetSequence,
  },
  {
    id: "user-management",
    path: "/users",
    name: "User Management",
    description: "Add users and manage access.",
    icon: "👥",
    adminOnly: true,
    component: UserManagement,
  },
];

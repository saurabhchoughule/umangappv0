# umangappv0
This Repo is created for version 1 app build for our Karaoke Group

Features
- Frontend to Karaoke Activities
- Episode wise songs data

## Tech stack
- React + Vite (front-end)
- Vercel serverless function for the singer list (`api/`)
- Hosting target: Vercel free tier

## Getting started
```
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## How the app is organised
The home page is a launcher. Each feature is a self-contained **module**, listed on the home page as a card.

```
api/                      Backend (serverless)
  _singers.js             Fixed singer list (edit names here)
  singers.js              GET /api/singers
src/
  App.jsx                 Routes: home + one route per module
  pages/Home.jsx          Module cards, generated from the registry
  lib/utils.js            Shared helpers: shuffle, sleep, useSingers()
  modules/
    registry.js           List of all modules
    solo-ranking/         Module: Solo Ranking for Day
    duet-sequence/        Module: Duet Song Selection
```

## Modules

### Solo Ranking for Day (`/solo-ranking`)
1. **Select singers** from the singer list (at least 2).
2. **Draw**: an animated slot-machine reveal picks the solo order one rank at a time. "Draw again" re-shuffles.

### Duet Song Selection (`/duet-sequence`)
1. **Select pairs**: tap two singers to form a pair. A singer can be in more than one pair; duplicate pairs are not allowed (at least 2 pairs).
2. **Review**: all pairs are shown together on one screen.
3. **Draw**: an animated reveal builds the duet singing sequence. "Draw again" re-shuffles.

## Adding a new module
1. Create a folder `src/modules/<module-name>/` with a React component (e.g. `MyModule.jsx`).
2. Register it in [src/modules/registry.js](src/modules/registry.js):
   ```js
   import MyModule from "./my-module/MyModule.jsx";

   {
     id: "my-module",
     path: "/my-module",
     name: "My Module",
     description: "One-line summary shown on the home card.",
     icon: "🎵",
     component: MyModule,
   }
   ```
3. That's it. The route and the home page card are created automatically.

Use `useSingers()`, `shuffle()` and `sleep()` from `src/lib/utils.js` for common needs.

## Singer list
Singers are served by the backend at `/api/singers`, from the fixed list in `api/_singers.js`. Locally, Vite serves the same data. In future this can become its own module backed by a database.

## Deploying to Vercel
Import the GitHub repo at vercel.com. The Vite framework is auto-detected, and `vercel.json` handles page routing.

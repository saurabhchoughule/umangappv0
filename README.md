# umangappv0
A simple, modern web app that makes our Karaoke Group's sessions more fun and organised. This is version 1.

## Features
- A home page that brings all karaoke activities together as modules
- Fair, animated draws for solo and duet performance order
- Episode-wise songs data (coming soon)

## Tech stack
- React + Vite (front-end)
- Vercel-style serverless functions in `api/` (auth, users, singers)
- libSQL/SQLite database (local file in dev, Turso free tier in production)
- Argon2id password hashing, signed httpOnly session cookies
- Hosting target: Vercel free tier

## Getting started
```
npm install
cp .env.example .env   # then fill in AUTH_SECRET and ADMIN_SETUP_KEY (see file)
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
    episodes/             Module: Karaoke Episodes (full session workflow)
    solo-ranking/         Module: Solo Ranking for Day
    duet-sequence/        Module: Duet Song Selection
    user-management/      Module: User Management (admin only)
  auth/AuthContext.jsx    Session state for the whole app
  pages/                  Login, Setup (first admin), SetPassword
api/episodes.js, songs.js, ratings.js   Episode workflow, song catalogue, ratings
api/_lib/                 DB access + auth helpers (not exposed as endpoints)
```

## Modules

### Karaoke Episodes (`/episodes`)
One module for a whole session, stored in the database for future reference.
1. **Details** (admin): date (weekday is automatic), venue, optional title/theme/remarks. Title defaults to "Episode N".
2. **Solo**: pick singers from the list or add a guest on the spot, then draw. The server picks and saves the order; the screen animates it.
3. **Duet**: build pairs (or choose "No duets"), then draw the same way.
4. **Go live**: optionally pick songs, then start the session. The lineup and draw are locked from here.
5. **Session** (everyone): admin marks each performance as performed and picks its song from a searchable list (new songs can be added on the spot: name, original singer, language, movie/album, year, lyrics link).
6. **Ratings**: any signed-in user rates a performed song from 0 to 5, **once** (final). The final average and distribution appear when every active user has rated, or when the admin closes voting, or when the episode is finished. Individual scores are never shown.
7. **Finish episode** (admin): closes voting. Afterwards only admins can edit the episode details.

Normal users see live and completed episodes only; drafts are admin-only. Live pages refresh every 8 seconds.

Lyrics are stored as a link, not text, to avoid copying copyrighted lyrics.

### Solo Ranking for Day (`/solo-ranking`)
1. **Select singers** from the singer list (at least 2).
2. **Draw**: an animated slot-machine reveal picks the solo order one rank at a time. "Draw again" re-shuffles.

### Duet Song Selection (`/duet-sequence`)
1. **Select pairs**: tap two singers to form a pair. A singer can be in more than one pair; duplicate pairs are not allowed (at least 2 pairs).
2. **Review**: all pairs are shown together on one screen.
3. **Draw**: an animated reveal builds the duet singing sequence. "Draw again" re-shuffles.

### User Management (`/users`, admin only)
Admins add users (name, username, role). The app generates a **one-time setup link** (valid 48 hours) that the admin shares privately. The new user opens it and chooses their own password, so admins never see passwords. Admins can also issue a new link (password reset), change roles, and disable or enable users.

## Login and access
- The app opens on a login page. Everything else, including `/api/singers`, needs a signed-in user.
- Roles: **admin** (everything, plus User Management) and **user** (regular modules).
- **First run:** open the app and choose "Create the admin account". You need `ADMIN_SETUP_KEY` from `.env`. This only works while there are no users.
- Passwords: min 10 characters, stored as Argon2id hashes. Accounts lock for 15 minutes after 5 failed logins.
- Hide a module from non-admins with `adminOnly: true` in the registry.

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
1. Create a free Turso database (`turso db create umang`, then `turso db show umang --url` and `turso db tokens create umang`).
2. Import the GitHub repo at vercel.com. The Vite framework is auto-detected, and `vercel.json` handles page routing.
3. Add environment variables in Vercel: `AUTH_SECRET`, `ADMIN_SETUP_KEY`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`.
4. Deploy, open the site, and create the admin account.

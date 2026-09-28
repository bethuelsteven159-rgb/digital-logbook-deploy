# Third-Party Code Documentation

Owner: Sino

This document lists the third-party libraries used across the Digital Logbook project — both `client/` and `server/` — and why each one made the cut. `tech-stack.md` covers the bigger architectural picture (frameworks, database, deployment); this one is about the individual packages sitting inside those choices.

## Frontend (`client/`)

### Production dependencies

- **react** (`^19.0.0`) — The core of the UI. Most of the team already had React experience going in, which mattered more for a 6-person project than picking something theoretically "better" but unfamiliar to everyone.
- **react-dom** (`^19.0.0`) — Pairs with React to actually render components into the browser DOM.
- **react-router-dom** (`^7.18.2`) — Handles navigation between Dashboard, Projects, Profile, and Settings without full page reloads. Writing our own router would mean reimplementing nested routes, URL parsing, and back/forward browser behaviour by hand — not a good use of time on a project already tight on scope.
- **lucide-react** — A consistent icon set for buttons, sidebar links, and status indicators. With six people building different pages, letting everyone hand-draw or source their own icons would have made the UI feel visually inconsistent fast.

### Development dependencies

- **vite** (`^8.0.0`) — Our dev server and build tool. It starts and hot-reloads noticeably faster than older tools like Create React App, which adds up over hundreds of small edits during a sprint, especially with six people running it locally at once.
- **@vitejs/plugin-react** — Lets Vite actually understand and transform JSX syntax; without it Vite wouldn't know what to do with React component files.
- **@tailwindcss/vite** and **tailwindcss** — Utility CSS classes instead of separate stylesheets per component. Keeps spacing, colour, and typography consistent even when different people are building different pages independently, without needing a shared CSS file everyone edits at once.
- **vitest** — Test runner for the frontend. It shares Vite's existing config, so there's no second build/transform pipeline to maintain just for running tests.
- **@testing-library/react**, **@testing-library/jest-dom**, **@testing-library/user-event** — These simulate how a real person would use the app (clicking buttons, typing into fields) rather than poking at component internals directly, which tends to produce tests that survive harmless refactors instead of breaking on them.
- **jsdom** — Fakes a browser environment inside Node so component tests don't need to open an actual browser window to run, keeping the test suite fast enough to run on every commit.
- **oxfmt** — Keeps code formatting consistent across the team without everyone needing to manually agree on things like tabs vs. spaces or quote style during review.

## Backend (`server/`)

### Production dependencies

- **express** — The backbone of the API, handling routing and request/response logic. Building this from raw Node's `http` module would mean reimplementing routing, middleware, and body parsing from scratch — time better spent on actual features.
- **cors** — Browsers block requests between different origins by default as a security measure. Since the frontend and backend run on different ports in development (and different domains in production), this package explicitly allows our own frontend through while still blocking arbitrary other sites.
- **dotenv** — Pulls secrets (DB credentials, JWT secret, Google OAuth keys) from a local `.env` file at runtime instead of hardcoding them into the source code, so they never end up committed to the repository.
- **pg** — The standard PostgreSQL driver for Node.js. We write raw SQL through this rather than going through a heavier ORM, which kept queries transparent and easy to debug across a team where multiple people were touching the same tables.
- **zod** — Validates request bodies against defined schemas before they reach any real logic. Given how many endpoints this project ended up with (entries, fields, filters, checklists, references...), manually writing `if` checks in every controller would have been repetitive and easy to get subtly wrong in one spot but not another.
- **jsonwebtoken** — Signs and verifies the JWTs that keep a user logged in after Google sign-in. This is exactly the kind of thing you don't want to hand-roll — a small mistake in token verification is a real security hole, and this library is the standard, well-tested choice used across most Node.js APIs.
- **google-auth-library** — Verifies the ID token Google sends back during sign-in, checking its signature against Google's public keys. Doing this manually would mean fetching and caching Google's keys ourselves and keeping that logic correct and up to date, which the library already handles.
- **mathjs** — Powers the computed-fields feature, evaluating user-typed formulas like `Hours * Rate` against an entry's other field values. The obvious alternative here was JavaScript's own `eval()`, but that would let a user's formula run arbitrary code on our server — a serious risk for a feature specifically designed to accept user-typed expressions. mathjs evaluates expressions safely, without that exposure.

### Development dependencies

- **nodemon** — Watches for file changes and restarts the server automatically, instead of manually stopping and restarting it after every backend edit.
- **vitest** — Same test runner as the frontend, mainly so the team only has to learn and configure one testing tool instead of two separate ones.

## Notes

- Versions reflect what's pinned in `client/package.json` and `server/package.json` at time of writing. If new dependencies get added later in the project, this file should be updated to match.
- The built-in Node.js test runner (`node --test`) also shows up in parts of the test suite alongside Vitest — that's not a third-party dependency, since it ships with Node.js itself.

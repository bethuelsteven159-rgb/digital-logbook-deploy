# Third-Party Code Documentation

Owner: Sino

This document lists the third-party libraries used across the Digital Logbook project — the root, `client/` and `server/` — and why each one made the cut, followed by the external services the application connects to. `tech-stack.md` covers the bigger architectural picture (frameworks, database, deployment); this one is about the individual packages sitting inside those choices.

## Root tooling (`package.json`)

The root package holds the tooling shared by the whole repository. It has no production dependencies.

### Development dependencies

- **concurrently** (`^10.0.5`) — Runs the client and server together from a single `npm run dev`, with each service's output labelled and colour-coded, so nobody needs two terminals open just to start the app.
- **eslint** (`^10.8.1`), **@eslint/js** (`^10.0.1`) and **globals** (`^17.11.0`) — Code quality checks across the repository. They catch mistakes such as unused variables or undefined names before they reach review.
- **prettier** (`^3.9.6`) and **eslint-config-prettier** (`^10.1.8`) — Prettier handles formatting (`npm run format:check`), and `eslint-config-prettier` switches off the ESLint rules that would otherwise conflict with it, so the two tools don't fight over the same lines.
- **vitest** (`^5.0.1`) and **@vitest/coverage-v8** (`^5.0.2`) — The test runner and its coverage provider at the root, used for running tests and producing the coverage reports described in `codecov-setup.md`.

## Frontend (`client/`)

### Production dependencies

- **react** (`^19.0.0`) — The core of the UI. Most of the team already had React experience going in, which mattered more for a 6-person project than picking something theoretically "better" but unfamiliar to everyone.
- **react-dom** (`^19.0.0`) — Pairs with React to actually render components into the browser DOM.
- **react-router-dom** (`^7.18.2`) — Handles navigation between Dashboard, Projects, Profile, and Settings without full page reloads. Writing our own router would mean reimplementing nested routes, URL parsing, and back/forward browser behaviour by hand — not a good use of time on a project already tight on scope.
- **lucide-react** (`^1.33.0`) — A consistent icon set for buttons, sidebar links, and status indicators. With six people building different pages, letting everyone hand-draw or source their own icons would have made the UI feel visually inconsistent fast.
- **three** (`0.186.1`) — The standard JavaScript library for 3D graphics in the browser (three.js). Used by the Constellation page (`ConstellationScene.jsx`) for its 3D scene. Building 3D rendering directly on WebGL would mean writing scenes, cameras, lighting and geometry handling from scratch.
- **@react-three/fiber** (`9.8.1`) — A React renderer for three.js, so 3D scenes can be written as React components and fit in with the rest of the UI code. The Constellation scene uses its `Canvas` and per-frame update hooks.
- **@react-three/drei** (`10.7.9`) — A collection of ready-made helpers for `@react-three/fiber`. The Constellation scene uses its `OrbitControls` (mouse and touch camera controls) and `Html` (HTML elements placed inside the 3D scene), saving the team from re-implementing them.

### Development dependencies

- **vite** (`^8.0.0`) — Our dev server and build tool. It starts and hot-reloads noticeably faster than older tools like Create React App, which adds up over hundreds of small edits during a sprint, especially with six people running it locally at once.
- **@vitejs/plugin-react** (`^6.0.0`) — Lets Vite actually understand and transform JSX syntax; without it Vite wouldn't know what to do with React component files.
- **@tailwindcss/vite** and **tailwindcss** (`^4.0.0`) — Utility CSS classes instead of separate stylesheets per component. Keeps spacing, colour, and typography consistent even when different people are building different pages independently, without needing a shared CSS file everyone edits at once.
- **vitest** (`^4.1.11`) — Test runner for the frontend. It shares Vite's existing config, so there's no second build/transform pipeline to maintain just for running tests.
- **@vitest/coverage-v8** (`^4.1.11`) and **c8** (`^12.0.0`) — Code coverage reporting for the frontend tests, using V8's built-in coverage so no code instrumentation is needed. See `codecov-setup.md` for how the reports are used.
- **@testing-library/react** (`^16.3.3`), **@testing-library/jest-dom** (`^6.9.1`), **@testing-library/user-event** (`^14.6.7`) — These simulate how a real person would use the app (clicking buttons, typing into fields) rather than poking at component internals directly, which tends to produce tests that survive harmless refactors instead of breaking on them.
- **jsdom** (`^26.1.0`) — Fakes a browser environment inside Node so component tests don't need to open an actual browser window to run, keeping the test suite fast enough to run on every commit.
- **oxfmt** (`^0.2.0`) — A fast code formatter installed in the client. Project-wide formatting checks run through Prettier at the repository root.

## Backend (`server/`)

### Production dependencies

- **express** (`^5.2.1`) — The backbone of the API, handling routing and request/response logic. Building this from raw Node's `http` module would mean reimplementing routing, middleware, and body parsing from scratch — time better spent on actual features.
- **cors** (`^2.8.6`) — Browsers block requests between different origins by default as a security measure. Since the frontend and backend run on different ports in development (and different domains in production), this package explicitly allows our own frontend through while still blocking arbitrary other sites.
- **dotenv** (`^17.4.2`) — Pulls secrets (DB credentials, JWT secret, Google OAuth keys, Gemini and YouTube API keys) from a local `.env` file at runtime instead of hardcoding them into the source code, so they never end up committed to the repository.
- **pg** (`^8.23.0`) — The standard PostgreSQL driver for Node.js. We write raw SQL through this rather than going through a heavier ORM, which kept queries transparent and easy to debug across a team where multiple people were touching the same tables.
- **zod** (`^4.4.3`) — Validates request bodies against defined schemas before they reach any real logic. Given how many endpoints this project ended up with (entries, fields, filters, checklists, references...), manually writing `if` checks in every controller would have been repetitive and easy to get subtly wrong in one spot but not another.
- **jsonwebtoken** (`^9.0.3`) — Signs and verifies the JWTs that keep a user logged in after Google sign-in. This is exactly the kind of thing you don't want to hand-roll — a small mistake in token verification is a real security hole, and this library is the standard, well-tested choice used across most Node.js APIs.
- **google-auth-library** (`^11.0.2`) — Verifies the ID token Google sends back during sign-in, checking its signature against Google's public keys. Doing this manually would mean fetching and caching Google's keys ourselves and keeping that logic correct and up to date, which the library already handles.
- **mathjs** (`^15.2.0`) — Powers the computed-fields feature, evaluating user-typed formulas like `Hours * Rate` against an entry's other field values. The obvious alternative here was JavaScript's own `eval()`, but that would let a user's formula run arbitrary code on our server — a serious risk for a feature specifically designed to accept user-typed expressions. mathjs evaluates expressions safely, without that exposure.

### Development dependencies

- **nodemon** (`^3.1.14`) — Watches for file changes and restarts the server automatically, instead of manually stopping and restarting it after every backend edit.
- **vitest** (`^5.0.0`) — Same test runner as the frontend, mainly so the team only has to learn and configure one testing tool instead of two separate ones.
- **@vitest/coverage-v8** (`^5.0.0`) and **c8** (`^12.0.0`) — Code coverage reporting for the backend tests, so coverage can be measured for both the Vitest suite and Node's built-in test runner.

## External services (not npm packages)

The application also depends on external services. Each is called from the backend, and the keys are server-side configuration only. None of them require an additional npm package: the server's dependencies above contain no Gemini or YouTube SDK.

| Service | Purpose | Documentation |
|---|---|---|
| Google Sign-In | Authenticates users with their Google account | [API Overview](./api-documentation.md) |
| Google Gemini API | AI project progress insights and text-to-speech narration | [External API Integration](./external-api/README.md) |
| YouTube Data API | Searches YouTube for learning videos on the Learning Videos page | [YouTube API Integration](./external-api/youtube-api.md) |
| Neon | Hosts the PostgreSQL database | [DATABASE.md](./DATABASE.md) |
| Brevo | Sends transactional emails for shared-project change notifications | [API Reference](./API.md) |
| dummyjson.com | Supplies the random motivational quote proxied by `GET /api/external/quote` | [API Reference](./API.md) |

## Notes

- Versions reflect what's pinned in the root `package.json`, `client/package.json` and `server/package.json` at time of writing. If new dependencies get added later in the project, this file should be updated to match.
- The built-in Node.js test runner (`node --test`) also shows up in parts of the test suite alongside Vitest — that's not a third-party dependency, since it ships with Node.js itself.

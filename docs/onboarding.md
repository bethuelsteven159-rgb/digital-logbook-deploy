# Developer Onboarding

Owner: Sino

Follow these steps to get the Digital Logbook running on your machine.

## Prerequisites

- Node.js v24 (the version used by the project's CI workflow; older versions may not work with the current dependencies)
- Git (for cloning the repository and version control)
- npm (included with Node.js, for managing dependencies)
- A code editor (VS Code recommended)
- Access to the project's PostgreSQL database (connection string from the team)
- Google OAuth credentials for sign-in (client ID from the team)

## 1. Clone the repository

```bash
git clone https://sdp.ms.wits.ac.za/code-cells/digital-notebook_final.git
cd digital-notebook_final
```

## 2. Install dependencies

The project contains two applications: a client (frontend) and a server (backend, including authentication).

You can install everything at once from the project root:

```bash
npm install
```

Or install each individually:

```bash
cd client
npm install
```

```bash
cd ../server
npm install
```

If Google sign-in fails with a `Cannot find module 'google-auth-library'` error, install it explicitly inside `server/`:

```bash
npm install google-auth-library
```

## 3. Environment variables

Copy `.env.example` to `.env` in `server/`:

```bash
cd server
cp .env.example .env
```

Create `client/.env` manually (no `.env.example` exists yet for `client/`):

```bash
cd ../client
```

**`server/.env` contains:**

| Variable | Purpose |
|---|---|
| `PORT` | Port the server runs on (default: 5000) |
| `FRONTEND_URL` | URL of the running client app, used for CORS (default: `http://localhost:8443`) |
| `DATABASE_URL` | PostgreSQL connection string (the team's shared database is PostgreSQL hosted on Neon) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID, used to verify Google sign-in tokens |
| `JWT_SECRET` | Secret used to sign and verify session tokens |
| `GEMINI_API_KEY` | Gemini API key for AI Project Progress and Text-to-Speech (optional for local setup) |
| `GEMINI_MODEL` | Gemini model used for AI Project Progress |
| `GEMINI_TTS_MODEL` | Gemini model used for text-to-speech generation |
| `GEMINI_TIMEOUT_MS` | Timeout for project-progress generation |
| `GEMINI_TTS_TIMEOUT_MS` | Optional timeout for speech generation |
| `YOUTUBE_API_KEY` | YouTube Data API key for the Learning Videos feature (optional for local setup) |
| `YOUTUBE_TIMEOUT_MS` | Timeout for YouTube search requests |

**`client/.env` contains:**

| Variable | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID used by the frontend sign-in button |
| `VITE_API_URL` | Base URL of the server API (default: `http://localhost:5000`) |

**Local setup requires a real database and Google sign-in.** The backend always connects to PostgreSQL and authenticates users with Google, so provide a real `DATABASE_URL`, `GOOGLE_CLIENT_ID` and `JWT_SECRET` in `server/.env`, and `VITE_GOOGLE_CLIENT_ID` and `VITE_API_URL` in `client/.env`. The team's shared database is PostgreSQL hosted on Neon; request the connection string through the team's private secret-sharing method. Note: `server/` also requires the `google-auth-library` package — if missing, run `npm install google-auth-library` inside `server/`.

**For the external API features** (AI Project Progress, Listen to Insight and Learning Videos), add `GEMINI_API_KEY` and `YOUTUBE_API_KEY` to `server/.env`. Without these keys the rest of the application still works, but the AI and Learning Videos features return a configuration error. Request the keys through the team's private secret-sharing method. See [External API Setup & Deployment](./external-api/setup-deployment.md) for the full list of variables.

- Never commit real `.env` files — they are excluded through `.gitignore`.
- Never put the Gemini or YouTube API keys in `client/.env`, frontend files or `.env.example`. Only the backend needs them.

## 4. Running the project locally

From the project root, run:

```bash
npm run dev
```

This starts the client and server together in a single terminal, using `concurrently`. Each service's output is labeled and color-coded (`client`, `server`) so you can tell them apart.

> If you ever need to run a component on its own (e.g. to debug just the server), you can still run it individually:
> ```bash
> cd server
> npm run dev
> ```

## 5. Confirming it's working

Once both are running, open:
http://localhost:8443/digital_logbook/


Note the `/digital_logbook/` path is required — the client is configured with a custom base path, so `http://localhost:8443` alone will not show the app.

Sign in with a Google account. If sign-in fails, check that `GOOGLE_CLIENT_ID` (in `server/.env`) and `VITE_GOOGLE_CLIENT_ID` (in `client/.env`) are set, and that the server can reach the database.

If you have configured the Gemini and YouTube keys, open a project and check that **Explain My Progress** and **Learning Videos** return results.

## 6. Running tests

Run the backend and frontend tests separately:

```bash
cd server
npm test
```

```bash
cd client
npm test
```

The external API tests use mocked providers, so they do not need real Gemini or YouTube keys. See [External API Testing & Failure Handling](./external-api/testing.md) for details.

## 7. Running linting and formatting

The project uses ESLint for code quality checks and Prettier for code formatting. Run these from the project root:

```bash
npm run lint:fix
npm run format:check
```

## 8. Project folder structure

```
digital-notebook_final/
├── .gitea/ → Gitea configuration files (e.g., pull request templates)
├── .github/
│   └── workflows/ → GitHub Actions workflow files
├── .vscode/ → VS Code project settings
├── client/ → React (Vite) frontend application
├── coverage/ → Test coverage output (coverage-final.json)
├── docs/ → Project documentation
├── node_modules/ → Installed root dependencies (generated by npm install)
├── server/ → Backend API server (Express.js, PostgreSQL, authentication)
├── .gitignore → Files/folders excluded from version control
├── .prettierignore → Files/folders excluded from Prettier formatting
├── .prettierrc → Prettier configuration
├── codecov.yml → Codecov configuration (see codecov-setup.md)
├── eslint.config.mjs → ESLint configuration
├── package-lock.json → Locked dependency versions (root)
├── package.json → Root project scripts, ESLint, and Prettier dependencies
├── pr-description.md → Pull request description notes
└── README.md → Project overview and setup instructions
```
For the full architecture breakdown, see [architecture.md](./architecture.md).

## Where to find more information

- Architecture decisions → [Architecture](./architecture.md)
- Git workflow and branching rules → [Git Workflow](./git-workflow.md)
- User stories and requirements → [Requirements](./requirements.md)
- Technology choices and reasoning → [Tech Stack](./tech-stack.md)
- Gemini and YouTube integration, keys and deployment → [External API Integration](./external-api/README.md)

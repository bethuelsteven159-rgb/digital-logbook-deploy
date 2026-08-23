# Developer Onboarding

Owner: Sino

Follow these steps to get the Digital Logbook running on your machine.

## Prerequisites

- Node.js v18 or higher
- Git (for cloning the repository and version control)
- npm (included with Node.js, for managing dependencies)
- A code editor (VS Code recommended)

## 1. Clone the repository

```bash
git clone https://sdp.ms.wits.ac.za/code-cells/digital-notebook_final.git
cd digital-notebook_final
```

## 2. Install dependencies

The project contains separate frontend and backend applications. Dependencies must be installed separately for each component.

Install client dependencies:

```bash
cd client
npm install
```

Install application server dependencies:

```bash
cd ../server
npm install
```

Install authentication backend dependencies:

```bash
cd ../backend
npm install
```

## 3. Environment variables

Copy `.env.example` to `.env` in the `server/` folder:

```bash
cd server
cp .env.example .env
```

The `server/.env` file contains:

| Variable                         | Purpose                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `PORT`                           | Port the application server runs on (default: 5000)                                                                                  |
| `FRONTEND_URL`                   | URL of the running client app, used for CORS (default: `http://localhost:8443`, matching the client's Vite dev server)               |
| `DATABASE_URL`                   | PostgreSQL connection string                                                                                                         |
| `USE_FAKE_DB`                    | When `true`, bypasses the real PostgreSQL database with an in-memory fake — useful for local development without setting up Postgres |
| `DEV_BYPASS_AUTH`                | When `true`, skips Google OAuth login for local development                                                                          |
| `DEV_USER_ID` / `DEV_USER_EMAIL` | Fake user identity used when `DEV_BYPASS_AUTH` is enabled                                                                            |

**For quick local setup**, leave `USE_FAKE_DB=true` and `DEV_BYPASS_AUTH=true` — this lets you run and test the app without a real database or Google credentials.

**For full setup** against the real database and auth, set `USE_FAKE_DB=false` and `DEV_BYPASS_AUTH=false`, and provide a real `DATABASE_URL` and Google OAuth credentials.

> **Open question:** `backend/.env.example` does not currently exist in the repo. The authentication backend requires Google OAuth and JWT configuration, but the exact variable names are unconfirmed — raise with the team before relying on `backend/` locally.

- Never commit real `.env` files — they are excluded through `.gitignore`.

## 4. Running the project locally

From the project root, run:

```bash
npm run dev
```

This starts the client, server, and backend together in a single terminal, using `concurrently`. Each service's output is labeled and color-coded (`client`, `server`, `backend`) so you can tell them apart.

> If you ever need to run a component on its own (e.g. to debug just the server), you can still run it individually:
>
> ```bash
> cd server
> npm run dev
> ```

## 5. Confirming it's working

Once all three are running, open: http://localhost:8443/digital_logbook/

Note the `/digital_logbook/` path is required — the client is configured with a custom base path, so `http://localhost:8443` alone will not show the app.

With `DEV_BYPASS_AUTH=true`, you should be able to reach the app without signing in via Google, using the fake dev user configured in `server/.env`.

## 6. Running tests

Testing configuration is currently pending confirmation.
If tests are added, they can be executed using:

```bash
npm test
```

## 7. Running linting and formatting

The project uses ESLint for code quality checks and Prettier for code formatting. Run these from the project root:

```bash
npm run lint:fix
npm run format:check
```

## 8. Project folder structure

digital-notebook_final/
├── .gitea/ → Gitea configuration files (e.g., pull request templates)
├── .vscode/ → VS Code project settings
├── backend/ → Authentication backend service (Google OAuth, JWT)
├── client/ → React (Vite) frontend application
├── docs/ → Project documentation
├── server/ → Main backend API server (Express.js, PostgreSQL)
├── .gitignore → Files/folders excluded from version control
├── .prettierignore → Files/folders excluded from Prettier formatting
├── .prettierrc → Prettier configuration
├── eslint.config.mjs → ESLint configuration
├── package-lock.json → Locked dependency versions (root)
├── package.json → Root project scripts, ESLint, and Prettier dependencies
└── README.md → Project overview and setup instructions

For the full architecture breakdown, see [architecture.md](./architecture.md).

## Where to find more information

- Architecture decisions → [Architecture](./architecture.md)
- Git workflow and branching rules → [Git Workflow](./git-workflow.md)
- User stories and requirements → [Requirements](./requirements.md)
- Technology choices and reasoning → [Tech Stack](./tech-stack.md)

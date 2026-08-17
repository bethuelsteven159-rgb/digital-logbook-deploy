# Developer Onboarding

Owner: Sino (Member 6)

Follow these steps to get the Digital Logbook running on your machine.

## Prerequisites

- Node.js v18 or higher
- Git
- npm (comes with Node)
- A code editor (VS Code recommended)

## 1. Clone the repository

```bash
git clone <gitea-repo-link>
cd digital-logbook
```

## 2. Install dependencies

The project is one repository with separate frontend and backend folders — install each independently.

```bash
cd client
npm install

cd ../server
npm install
```

## 3. Environment variables

> **Open question:** exact variables pending Supabase setup confirmation.

- Copy `.env.example` to `.env` in both `client/` and `server/`.
- Fill in the Supabase project URL and API key once available.
- Never commit your real `.env` file — it's excluded via `.gitignore`.

## 4. Running the project locally

```bash
# Terminal 1 — backend
cd server
npm run dev

# Terminal 2 — frontend
cd client
npm run dev
```

## 5. Running tests

```bash
npm test
```

Uses Vitest — the same command works in both `client/` and `server/`.

## 6. Running linting and formatting

> **Open question:** exact scripts pending Bethuel's ESLint/Prettier setup.

```bash
npm run lint
npm run format
```

## 7. Project folder structure

```
digital-logbook/
├── client/     → React (Vite) frontend
├── server/     → Node.js + Express backend
└── docs/       → project documentation (this folder)
```

For the full architecture breakdown, see [architecture.md](./architecture.md).

## Where to find more information

- Architecture decisions → [architecture.md](./architecture.md)
- Git workflow and branching rules → [git-workflow.md](./git-workflow.md)
- User stories and requirements → [requirements.md](./requirements.md)
- Tech stack and reasoning → [tech-stack.md](./tech-stack.md)

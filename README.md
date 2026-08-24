# Digital Logbook

A customisable, offline-first digital logbook that lets students capture project work, log entries, and track time spent — accessible from any device, syncing automatically once back online.

Built by team **Code Cells**.

📄 Full documentation: [Documentation Website](https://effortless-tartufo-a533a9.netlify.app/) — architecture, tech stack, requirements, workflow, and onboarding.

## Project Structure

```
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
```

## Getting Started

```bash
npm install
npm run dev
```

This starts the client, server, and backend together in one terminal. Then open:
http://localhost:8443/digital_logbook/

See the [full onboarding guide][full onboarding guide](https://polite-pixie-cb045c.netlify.app/#/onboarding) for environment variable setup, database configuration, and troubleshooting.

## Team — Code Cells

| Section                                      | Owner    |
| -------------------------------------------- | -------- |
| Project Methodology & Sprint Tracking        | Tumi     |
| Git Workflow & Development Standards         | Bethuel  |
| System Architecture, Backend & API           | Inga     |
| Frontend Architecture, UI/UX & Accessibility | Morare   |
| Requirements & User Stories                  | Simphiwe |
| Tech Stack & Developer Onboarding            | Sino     |

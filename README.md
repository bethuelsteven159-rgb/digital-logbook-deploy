# Digital Logbook

A customisable, offline-first digital logbook that lets students capture project work, log entries, and track time spent — accessible from any device, syncing automatically once back online.

Built by team **Code Cells**.

## Project Structure

```
digital-notebook_final/
├── .gitea/ → Gitea configuration files (e.g., pull request templates)
├── .vscode/ → VS Code project settings
├── client/ → React (Vite) frontend application
├── docs/ → Project documentation
├── server/ → Backend API server (Express.js, PostgreSQL)
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

See the [full onboarding guide][full onboarding guide](https://unrivaled-pavlova-20058d.netlify.app/#/onboarding) for environment variable setup, database configuration, and troubleshooting.

## Team — Code Cells

| Section                                      | Owner    |
| --------------------------------------------- | -------- |
| Project Methodology & Sprint Tracking        | Tumi     |
| Git Workflow & Development Standards         | Bethuel  |
| System Architecture, Backend & API           | Inga     |
| Frontend Architecture, UI/UX & Accessibility | Morare   |
| Requirements & User Stories                  | Simphiwe |
| Tech Stack & Developer Onboarding            | Sino     |
| Third-Party Code Documentation               | Sino     |
| Testing Documentation                        | Sino     |

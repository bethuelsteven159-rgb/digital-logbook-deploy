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

The project currently contains the frontend application in the `client` folder. Install the required dependencies before running the application.

```bash
cd client
npm install

## 3. Environment variables

> Exact environment variables are pending final backend/database configuration.

- Copy `.env.example` to `.env` in the `client/` folder.
- Add required environment values once the services are confirmed.
- Never commit real `.env` files — they are excluded through `.gitignore`.

## 4. Running the project locally

```bash
cd client
npm run dev

## 5. Running tests

Testing setup is currently pending confirmation.
Once configured, tests can be run using:
```bash
npm test

## 6. Running linting and formatting

The project uses ESLint for code quality checks and Prettier for code formatting.
Run linting:
```bash
npm run lint

## 7. Project folder structure
digital-logbook/
├── client/ → React (Vite) frontend
├── docs/ → project documentation
├── .gitea/ → Gitea configuration files (e.g., pull request templates)
├── .vscode/ → VS Code project settings
├── eslint.config.js → ESLint configuration
└── package.json → project scripts and dependencies

For the full architecture breakdown, see [architecture.md](./architecture.md).

## Where to find more information

- Architecture decisions → [Architecture](./architecture.md)
- Git workflow and branching rules → [Git Workflow](./git-workflow.md)
- User stories and requirements → [Requirements](./requirements.md)
- Technology choices and reasoning → [Tech Stack](./tech-stack.md)

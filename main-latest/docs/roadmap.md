# Development Roadmap

Owner: Tumi

## Overview

The project is being developed incrementally across six broad stages, executed through Agile/Scrum sprints (see [Methodology](./methodology.md) for the sprint-by-sprint log). The roadmap is intentionally flexible — Agile development allows priorities to shift based on client feedback, technical issues, and the team's actual progress, rather than locking every stage to a fixed date up front.

Stage 2 and Stage 4 map directly onto the feature tiers defined in [Requirements](./requirements.md) — Stage 2 corresponds to **Basic Features**, and Stage 4 corresponds to **Intermediate/Advanced Features** — so the roadmap and the requirements document stay consistent with each other.

As of now, the team has completed **Sprint 1** and is partway through **Sprint 2**. The status below reflects real, verifiable progress (cross-checked against [Tech Stack](./tech-stack.md), [Bug Tracking](./bug-tracking.md), [Requirements](./requirements.md), and [Methodology](./methodology.md), including the Stakeholder Reviews section), not a projection of future sprints.

## Roadmap at a Glance

| Stage | Focus | Status | Sprint(s) |
| --- | --- | --- | --- |
| 1 | Project Setup | 🟢 Mostly complete | Sprint 1 (repo structure refined Sprint 2) |
| 2 | Core Functionality (Basic Features) | 🟢 Implemented | Sprint 1 |
| 3 | Authentication & User Management | 🟢 Implemented, tested locally | Sprint 1 (OAuth config finalised Sprint 2) |
| 4 | Feature Development (Intermediate/Advanced) | 🟡 In progress | Sprint 2 |
| 5 | Testing & Integration | 🟡 Started (deployment, external tester feedback); formal test coverage still outstanding | Sprint 2 onward |
| 6 | Finalisation | ⚪ Not started | Planned |

## Stage 1 – Project Setup

* Establish the development environment.
* Set up the repository and branching strategy.
* Establish the frontend and backend structure.
* Define the initial database and application architecture.

**Progress in Sprint 1:** the repository and Git workflow are in place — feature-branch + Pull Request process, a PR template, and branch/commit naming conventions have all been agreed and set up. ESLint and Prettier are configured for consistent code quality, and Gitea Actions is configured to run automated checks on Pull Requests. The documentation website has also been set up, with each member documenting their assigned area under Gitea.

The technical foundation has been confirmed: a **React (Vite)** frontend and a **Node.js/Express** backend, split into an authentication backend and a main application server, both organised in a single monorepo. **PostgreSQL** was selected as the primary database, connected via `pg`, with `dotenv` for environment configuration and `Zod` for input validation. The initial architecture has also been corrected where needed — clarifying that browser Local Storage/IndexedDB is not the primary database and that the backend/database remains the authoritative source of truth once data syncs.

**Progress in Sprint 2:** the repository structure was refined further after duplicate `package.json` files appeared once the frontend and backend were being worked on independently. Following client guidance, frontend and backend now keep separate `package.json` files since they deploy separately, with the root-level configuration retained purely for local development convenience.

## Stage 2 – Core Functionality *(Basic Features)*

This stage corresponds to the **Basic Features** tier in the requirements: authentication, projects (create/view/edit/archive), log entries (create, customise fields, quick capture), time tracking, entry history, search, filter, and basic statistics.

**Progress in Sprint 1:** the core Basic Feature set has been implemented ahead of the original plan, alongside authentication. This includes user profile management, project creation, editing and archiving, log entry creation, search and filtering of entries, time tracking, and basic statistics on the dashboard. Formal testing and stakeholder acceptance of these features is still to be confirmed and carried out in Stage 5.

## Stage 3 – Authentication and User Management

* Implement user authentication.
* Integrate Google authentication.
* Implement user profiles and account-related functionality.
* Secure authenticated backend routes.

**Progress in Sprint 1:** authentication has been implemented using Google OAuth 2.0 for identity verification and a backend-issued JWT for session management, per the requirements document's FR-001–FR-004. The full flow — Google sign-in → ID token verification → user lookup/creation → JWT issuance → protected `current-user` endpoint → PostgreSQL persistence — was implemented and **successfully tested locally**, following resolution of several integration issues (backend structure duplication, OAuth origin configuration, port mismatch, a missing frontend dependency, database connection configuration, and a Git merge conflict — see [Bug Tracking](./bug-tracking.md)). Authentication is still subject to formal project testing and stakeholder acceptance.

**Progress in Sprint 2:** the Google OAuth consent screen was explicitly configured as **External** on client guidance, so the app isn't restricted to a single Google Workspace organisation and can be signed into by any user. A sign-in issue affecting some team members locally was also identified and resolved (a missing test-user entry in the Google Console), and is tracked in [Bug Tracking](./bug-tracking.md).

## Stage 4 – Feature Development *(Intermediate Features)*

This stage corresponds to the **Intermediate** tier (tags, checklists, entry links, computed fields, saved filters, calendar/board views, offline capture and sync, export/import) and **Advanced** tier (custom calculations, custom dashboards, historical versioning, structured search, automation/reminders, long-term performance) from the requirements document.

**Progress in Sprint 2:** with the core system (Stage 2) stable, work moved into the Intermediate tier. User stories were assigned across the team User Story Assignment): Tumi completed tags on entries (US-101); Morare completed export/import (US-113) and continued work on project references (US-104) and checklists (US-102); Bethuel and Simphiwe both deployed their assigned work; Inga made progress on automatically calculating time spent on an entry, and simplified the calculation approach after client feedback that the original version was confusing; Sino was close to finishing her assigned stories (computed fields, due dates, saved filters). The remaining Intermediate items (calendar/board views, entry links, offline capture and sync) and all Advanced-tier items remain outstanding. Per the requirements document, feature tiers remain prioritisation guidance rather than a fixed requirement to implement everything.

## Stage 5 – Testing and Integration

* Test individual features.
* Perform integration testing.
* Fix bugs and regressions.
* Review code quality.
* Ensure acceptance criteria are satisfied.

**Progress in Sprint 1:** formal testing has not started, but the groundwork is in place — Gitea Actions is configured to run automated checks on Pull Requests, and the team's Definition of Done (in [Git Workflow](./git-workflow.md)) requires relevant tests and passing checks before a Pull Request can be merged. Authentication has been manually tested locally and verified end-to-end, and issues found during that process are tracked in [Bug Tracking](./bug-tracking.md). Formal/automated test coverage is planned to begin from Sprint 2.

**Progress in Sprint 2:** deployment was prioritised at the start of the sprint, and by mid-sprint Simphiwe and Bethuel had both successfully deployed their assigned work. A feedback document was created to gather structured input from outside testers once features were deployed. A mid-sprint review was also held with the client, where the team demonstrated progress; the client's main feedback was that navigation between some features was confusing, which the team accepted and is addressing. Separately, the client requested that code coverage be configured on Gitea; this has been logged as a backlog item but **is not yet implemented**, so formal/automated test coverage remains outstanding going into later sprints.

## Stage 6 – Finalisation

* Complete remaining backlog items.
* Perform final system testing.
* Improve documentation.
* Resolve remaining defects.
* Prepare the system for final demonstration and submission.

**Status:** not yet started. This stage will only begin once the preceding stages are substantially complete.

## Why the Roadmap Is Structured This Way

The stages are ordered so that foundational work (setup, architecture, authentication) is completed before building out secondary features, testing, and finalisation. In practice, Sprint 1 moved faster than the original stage-by-stage plan assumed — authentication (Stage 3) and the full Basic Feature set (Stage 2) were both implemented in the same sprint, since a working authenticated session was needed before project and entry functionality could be built and tested end-to-end anyway. This reflects an intentional Agile adjustment rather than a deviation from the plan, and gave the team a stable foundation to move into Intermediate/Advanced features (Stage 4) and formal testing (Stage 5) from Sprint 2 onward. Sprint 2 has confirmed this: Intermediate-tier user stories are actively being implemented, deployment has begun, and external tester feedback is being gathered — though formal/automated test coverage on Gitea, requested by the client, is still outstanding and carries forward as a priority into the next sprint.

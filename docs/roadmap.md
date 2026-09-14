# Development Roadmap

Owner: Tumi

## Overview

The project is being developed incrementally across six broad stages, executed through Agile/Scrum sprints (see [Methodology](./methodology.md) for the sprint-by-sprint log). The roadmap is intentionally flexible — Agile development allows priorities to shift based on client feedback, technical issues, and the team's actual progress, rather than locking every stage to a fixed date up front.

Stage 2 and Stage 4 map directly onto the feature tiers defined in [Requirements](./requirements.md) — Stage 2 corresponds to **Basic Features**, and Stage 4 corresponds to **Intermediate/Advanced Features** — so the roadmap and the requirements document stay consistent with each other.

As of now, the team has completed **Sprint 1** only. The status below reflects real, verifiable progress (cross-checked against [Tech Stack](./tech-stack.md), [Bug Tracking](./bug-tracking.md), and [Requirements](./requirements.md)), not a projection of future sprints.

## Roadmap at a Glance

| Stage | Focus | Status | Sprint(s) |
| --- | --- | --- | --- |
| 1 | Project Setup | 🟢 Mostly complete | Sprint 1 |
| 2 | Core Functionality (Basic Features) | 🟢 Implemented | Sprint 1 |
| 3 | Authentication & User Management | 🟢 Implemented, tested locally | Sprint 1 |
| 4 | Feature Development (Intermediate/Advanced) | 🟢 Partially implemented | Sprint 2 |
| 5 | Testing & Integration | 🟡 In progress | Sprint 2 onward |
| 6 | Finalisation | ⚪ Not started | Planned |

## Stage 1 – Project Setup

* Establish the development environment.
* Set up the repository and branching strategy.
* Establish the frontend and backend structure.
* Define the initial database and application architecture.

**Progress in Sprint 1:** the repository and Git workflow are in place — feature-branch + Pull Request process, a PR template, and branch/commit naming conventions have all been agreed and set up. ESLint and Prettier are configured for consistent code quality, and Gitea Actions is configured to run automated checks on Pull Requests. The documentation website has also been set up, with each member documenting their assigned area under Gitea.

The technical foundation has been confirmed: a **React (Vite)** frontend and a **Node.js/Express** backend, split into an authentication backend and a main application server, both organised in a single monorepo. **PostgreSQL** was selected as the primary database, connected via `pg`, with `dotenv` for environment configuration and `Zod` for input validation. The initial architecture has also been corrected where needed — clarifying that browser Local Storage/IndexedDB is not the primary database and that the backend/database remains the authoritative source of truth once data syncs.

## Stage 2 – Core Functionality *(Basic Features)*

This stage corresponds to the **Basic Features** tier in the requirements: authentication, projects (create/view/edit/archive), log entries (create, customise fields, quick capture), time tracking, entry history, search, filter, and basic statistics.

**Progress in Sprint 1:** the core Basic Feature set has been implemented ahead of the original plan, alongside authentication. This includes user profile management, project creation, editing and archiving, log entry creation, search and filtering of entries, time tracking, and basic statistics on the dashboard. Formal testing and stakeholder acceptance of these features is still to be confirmed and carried out in Stage 5.

## Stage 3 – Authentication and User Management

* Implement user authentication.
* Integrate Google authentication.
* Implement user profiles and account-related functionality.
* Secure authenticated backend routes.

**Progress in Sprint 1:** authentication has been implemented using Google OAuth 2.0 for identity verification and a backend-issued JWT for session management, per the requirements document's FR-001–FR-004. The full flow — Google sign-in → ID token verification → user lookup/creation → JWT issuance → protected `current-user` endpoint → PostgreSQL persistence — was implemented and **successfully tested locally**, following resolution of several integration issues (backend structure duplication, OAuth origin configuration, port mismatch, a missing frontend dependency, database connection configuration, and a Git merge conflict — see [Bug Tracking](./bug-tracking.md)). Authentication is still subject to formal project testing and stakeholder acceptance.

## Stage 4 – Feature Development *(Intermediate/Advanced Features)*

This stage corresponds to the **Intermediate** tier (tags, checklists, entry links, computed fields, saved filters, calendar/board views, offline capture and sync, export/import) and **Advanced** tier (custom calculations, custom dashboards, historical versioning, structured search, automation/reminders, long-term performance) from the requirements document.

**Progress:** Intermediate functionality has been implemented across the current application, including checklists, project and entry references, computed fields, saved filters, calendar/board views, outstanding work/due dates, offline capture/synchronisation support, and export/import. The Person 4 entry-editing and settings work is also implemented. Advanced items remain deferred where they have not been implemented.

## Stage 5 – Testing and Integration

* Test individual features.
* Perform integration testing.
* Fix bugs and regressions.
* Review code quality.
* Ensure acceptance criteria are satisfied.

**Progress:** automated client testing is now in place for the implemented feature work. The current test run reports 6 test files passed, 44 tests passed and 0 failures, including entry details, entry editing, project details, settings, preferences and entry-feature API behaviour. Broader integration testing, full backend test coverage and stakeholder acceptance remain ongoing.

## Stage 6 – Finalisation

* Complete remaining backlog items.
* Perform final system testing.
* Improve documentation.
* Resolve remaining defects.
* Prepare the system for final demonstration and submission.

**Status:** not yet started. This stage will only begin once the preceding stages are substantially complete.

## Why the Roadmap Is Structured This Way

The stages are ordered so that foundational work (setup, architecture, authentication) is completed before building out secondary features, testing, and finalisation. In practice, Sprint 1 moved faster than the original stage-by-stage plan assumed — authentication (Stage 3) and the full Basic Feature set (Stage 2) were both implemented in the same sprint, since a working authenticated session was needed before project and entry functionality could be built and tested end-to-end anyway. This reflects an intentional Agile adjustment rather than a deviation from the plan, and gives the team a stable foundation to move into Intermediate/Advanced features (Stage 4) and formal testing (Stage 5) from Sprint 2 onward.

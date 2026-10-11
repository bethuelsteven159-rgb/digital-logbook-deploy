# Digital Logbook — Project Documentation

This folder is the single source of truth for the Digital Logbook project. Each section below is owned by one team member and updated by them directly.

## Contents

| Section | Owner | File |
|---|---|---|
| Project Methodology & Sprint Tracking | Tumi | [methodology.md](./methodology.md) |
| Git Workflow & Development Standards | Bethuel | [git-workflow.md](./git-workflow.md) |
| System Architecture, Backend & API | Inga | [architecture.md](./architecture.md) |
| Frontend Architecture, UI/UX & Accessibility | Morare | [ui-ux.md](./ui-ux.md) |
| Requirements & User Stories | Simphiwe | [requirements.md](./requirements.md) |
| Tech Stack | Sino | [tech-stack.md](./tech-stack.md) |
| Developer Onboarding | Sino | [onboarding.md](./onboarding.md) |
| Database Documentation | Inga | [DATABASE.md](./DATABASE.md) |
| Roadmap | Tumi | [roadmap.md](./roadmap.md) |
| Bug Tracking | Simphiwe | [bug-tracking.md](./bug-tracking.md) |
| Third-Party Code Documentation | Sino | [third-party-code.md](./third-party-code.md) |
| Testing Documentation | Sino | [testing-documentation.md](./testing-documentation.md) |
| API Reference | Simphiwe | [API.md](./API.md) |
| API Overview | Morare | [api-documentation.md](./api-documentation.md) |
| External API Integration (Gemini & YouTube) | Morare & Sino | [external-api/README.md](./external-api/README.md) |
| Codecov Setup | Bethuel | [codecov-setup.md](./codecov-setup.md) |
| Performance Benchmark — Custom Statistics | Bethuel | [performance.md](./performance.md) |
| Frontend Performance — PageSpeed Insights | Bethuel | [pagespeed.md](./pagespeed.md) |

## How the documents fit together

The documents follow the life of the project: what we set out to build, how it is designed, how to build and run it, and how we know it works. Arrows show which document informs the next.

```text
PLAN
  requirements ───► methodology ───► roadmap
  (what to build)   (how we work,    (what is next)
        │            sprints)
        │                │
        │          git-workflow · bug-tracking
        ▼
DESIGN
  architecture ◄───► ui-ux
        │
        ├──────────────┬───────────────────┐
        ▼              ▼                   ▼
    DATABASE         API.md ◄───► api-documentation
                       │
                       ▼
                external-api/
                  ├─ gemini-project-progress
                  ├─ gemini-text-to-speech
                  ├─ youtube-api
                  ├─ setup-deployment
                  └─ testing

BUILD
  tech-stack ───► third-party-code
        │
        ▼
   onboarding

VERIFY
  testing-documentation ───► codecov-setup
        │
        └── performance · pagespeed
```

**Read it as follows**

- **Plan:** `requirements.md` defines the user stories. `methodology.md` and `roadmap.md` track how and when they are delivered, `git-workflow.md` sets the team's working rules, and `bug-tracking.md` records the problems found along the way.
- **Design:** `architecture.md` and `ui-ux.md` describe how the system is structured. `DATABASE.md` documents the data, `API.md` and `api-documentation.md` document the backend API, and the `external-api/` pages document the Gemini and YouTube integrations.
- **Build:** `tech-stack.md` explains the technology choices and `third-party-code.md` lists the packages behind them. `onboarding.md` gets a new developer running.
- **Verify:** `testing-documentation.md` describes the tests and coverage. `codecov-setup.md`, `performance.md` and `pagespeed.md` cover coverage reporting and performance measurement.

**Where to start**

- **New developer:** `onboarding.md`, then `tech-stack.md`, `architecture.md` and `API.md`.
- **Reviewer:** `requirements.md`, then `methodology.md`, `roadmap.md`, `bug-tracking.md` and `testing-documentation.md`.

## How this folder works

- Each file above belongs to one owner. Update your own section directly — don't edit someone else's without asking them first.
- Push changes following the Git workflow described in [git-workflow.md](./git-workflow.md), including the agreed branching and pull request process.
- If a section is missing information, add a `> **Open question:**` note inline rather than guessing, and raise it at the next team meeting.
- This structure is maintained by Sino. If your section doesn't fit the format, or you're not sure where something goes, ask before creating new files. When a file is added, renamed or removed, update the Contents table and the diagram above.

## Project overview

**What is the Digital Logbook?**

A customisable, offline-first digital logbook that lets a student capture project work, log entries, and time spent — accessible from any device, syncing automatically once back online.

**What problem does it solve?**

Physical logbooks get left at home. This system is always available, works with no internet connection, and syncs across devices once reconnected.

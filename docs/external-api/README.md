# External API Integration

Owner: Morare

## Overview

The Digital Logbook uses the Google Gemini API as an external service for two project-level features:

- **AI Project Progress** — interprets factual project activity and returns a concise progress summary, focus areas, activity trend and suggested next step.
- **AI Text-to-Speech** — converts the generated project insight into spoken audio that can be played from the Project Details page.

The integration is implemented through the Digital Logbook backend. The React frontend communicates only with the application's own API; it does not call Gemini directly and does not contain the Gemini API key.

This section documents the external API implementation that is currently present in the merged application.

## Documentation Pages

| Page | Purpose |
|---|---|
| [Gemini Project Progress](./gemini-project-progress.md) | Explains the progress-analysis flow, evidence, prompt constraints and response structure. |
| [Gemini Text-to-Speech](./gemini-text-to-speech.md) | Explains narration generation, speech requests and browser playback. |
| [Setup & Deployment](./setup-deployment.md) | Documents environment variables, local setup, secrets and deployment requirements. |
| [Testing & Failure Handling](./testing.md) | Documents mocks, timeout behaviour, provider failures and automated tests. |

## Feature Location

The AI feature is available on the Project Details page.

The user flow is:

```text
Open Project
    |
    v
Project Details
    |
    v
Explain My Progress
    |
    v
Digital Logbook backend calculates project evidence
    |
    v
Gemini interprets the supplied evidence
    |
    v
AI Project Insight displayed
    |
    v
Listen to Insight
    |
    v
Gemini generates speech audio
    |
    v
Pause / Resume / Replay
```

## Application Architecture

```text
React Frontend
    |
    | authenticated Digital Logbook API request
    v
Express Backend
    |
    +--> Project Details service/repository --> PostgreSQL
    |
    +--> AI Project Progress service -------> Gemini
    |
    +--> AI Project TTS service ------------> Gemini
```

The database remains the source of truth for project and logbook information. Gemini is used only after the backend has loaded or received the information required for the requested AI operation.

## Main Implementation Files

### Frontend

```text
client/src/pages/Projects/AiProjectInsight.jsx
client/src/pages/Projects/ProjectDetails.jsx
client/src/api/projectDetailsApi.js
```

`AiProjectInsight.jsx` is rendered inside `ProjectDetails.jsx` and is responsible for the AI Project Coach interface, insight generation, speech generation and browser audio controls.

### Backend

```text
server/routes/projectDetails.js
server/controllers/projectDetailsController.js
server/services/aiProjectProgressService.js
server/services/aiProjectTtsService.js
```

The project-details controller first resolves the authenticated user and project before delegating the external API work to the relevant service.

## Digital Logbook API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/projects/:projectId/ai-progress` | Generate a project-progress insight from the selected project's evidence. |
| `POST` | `/api/projects/:projectId/ai-progress/speech` | Generate speech from a structured AI project insight. |

Both endpoints are protected by the application's existing authentication middleware and project ownership checks.

## Security Boundary

The Gemini API key is server-side configuration.

The frontend never needs to receive the key. A normal user interacts with:

```text
Browser -> Digital Logbook backend -> Gemini
```

rather than:

```text
Browser -> Gemini
```

This prevents the project API key from being exposed in the frontend bundle or browser storage.

## No Database Migration

The Gemini integration does not add database tables or columns.

It uses existing project and entry data, creates the AI evidence in memory, calls Gemini and returns the result to the frontend.

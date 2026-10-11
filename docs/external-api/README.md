# External API Integration

Owner: Morare & Sino

## Overview

The Digital Logbook uses external APIs as supporting services for project-level AI features and learning content:

- **Google Gemini API — AI Project Progress** — interprets factual project activity and returns a concise progress summary, focus areas, activity trend and suggested next step.
- **Google Gemini API — AI Text-to-Speech** — converts the generated project insight into spoken audio that can be played from the Project Details page.
- **YouTube Data API** — searches YouTube for relevant educational or project-related videos based on user-provided search queries and returns video information that can be displayed within the Digital Logbook.

The integration is implemented through the Digital Logbook backend. The React frontend communicates only with the application's own API; it does not call Gemini or YouTube directly and does not contain the external API keys.

This section documents the external API implementations that are currently present in the merged application.

## Documentation Pages

| Page | Purpose |
|---|---|
| [Gemini Project Progress](/external-api/gemini-project-progress.md) | Explains the progress-analysis flow, evidence, prompt constraints and response structure. |
| [Gemini Text-to-Speech](/external-api/gemini-text-to-speech.md) | Explains narration generation, speech requests and browser playback. |
| [YouTube API Integration](/external-api/youtube-api.md) | Explains YouTube video search, configuration, request handling, failure handling and tests. |
| [Setup & Deployment](/external-api/setup-deployment.md) | Documents environment variables, local setup, secrets and deployment requirements. |
| [Testing & Failure Handling](/external-api/testing.md) | Documents mocks, timeout behaviour, provider failures and automated tests. |

## Feature Location

The AI features are available on the Project Details page. The YouTube integration is available through the **Learning Videos** feature, which lets users search for YouTube tutorials relevant to their project.

The AI user flow is:

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

The YouTube search flow is:

```text
Open Project
     |
     v
Learning Videos
     |
     v
Enter search query
     |
     v
Digital Logbook backend
     |
     v
YouTube Data API
     |
     v
Learning videos displayed to the user
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
     +--> AI Project Progress service ---------> Gemini
     |
     +--> AI Project TTS service --------------> Gemini
     |
     +--> YouTube search service --------------> YouTube Data API
```

The database remains the source of truth for project and logbook information. Gemini is used only after the backend has loaded or received the information required for the requested AI operation.

The YouTube Data API is used only to retrieve video search results. The backend controls the external request and returns the required video information to the frontend.

## Main Implementation Files

### Frontend

```text
client/src/pages/Projects/AiProjectInsight.jsx
client/src/pages/Projects/ProjectDetails.jsx
client/src/pages/Projects/LearningVideos.jsx
client/src/api/projectDetailsApi.js
client/src/api/learningVideosApi.js
```

- `AiProjectInsight.jsx` is rendered inside `ProjectDetails.jsx` and is responsible for the AI Project Coach interface, insight generation, speech generation and browser audio controls.
- `LearningVideos.jsx` provides the interface for searching YouTube tutorials and displaying the returned videos.

### Backend

```text
server/controllers/projectDetailsController.js
server/services/aiProjectProgressService.js
server/services/aiProjectTtsService.js
server/services/youtubeSearchService.js
```

The project-details controller resolves the authenticated user and project before delegating the relevant external API work to the appropriate service.

## Digital Logbook API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/projects/:projectId/ai-progress` | Generate a project-progress insight from the selected project's evidence. |
| `POST` | `/api/projects/:projectId/ai-progress/speech` | Generate speech from a structured AI project insight. |
| `GET` | `/api/projects/:projectId/learning-videos` | Search YouTube for learning videos using the `q` query parameter, or the project name if `q` is omitted. See [YouTube API Integration](/external-api/youtube-api.md). |

The AI endpoints are protected by the application's existing authentication middleware and project ownership checks.

## YouTube Integration Summary

The Learning Videos feature searches YouTube through the backend and returns video results with generated watch URLs. The API key (`YOUTUBE_API_KEY`) and timeout (`YOUTUBE_TIMEOUT_MS`) are server-side configuration, and configuration errors, provider errors and timeouts are handled and returned as errors.

For configuration, search behaviour, failure handling and tests, see [YouTube API Integration](/external-api/youtube-api.md).

## Security Boundary

The Gemini and YouTube API keys are server-side configuration. The frontend never needs to receive them. A normal user interacts with:

```text
Browser -> Digital Logbook backend -> Gemini
Browser -> Digital Logbook backend -> YouTube Data API
```

rather than:

```text
Browser -> Gemini
Browser -> YouTube Data API
```

This prevents the external API keys from being exposed in the frontend bundle or browser storage.

## Testing

Automated tests cover both the Gemini and YouTube integrations. See [Testing & Failure Handling](/external-api/testing.md) for the Gemini tests and [YouTube API Integration](/external-api/youtube-api.md?id=testing) for the YouTube tests.

## No Database Migration

The Gemini and YouTube integrations do not add database tables or columns.

- The Gemini integration uses existing project and entry data, creates the AI evidence in memory, calls Gemini and returns the result to the frontend.
- The YouTube integration sends the search query to the YouTube Data API and returns the relevant video information without requiring additional database storage.

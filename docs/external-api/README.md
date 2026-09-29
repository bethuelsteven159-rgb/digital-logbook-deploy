**# External API Integration**

Owner: Morare & Sino

**## Overview**

The Digital Logbook uses external APIs as supporting services for project-level AI features and learning content:

- ****Google Gemini API — AI Project Progress**** — interprets factual project activity and returns a concise progress summary, focus areas, activity trend and suggested next step.

- ****Google Gemini API — AI Text-to-Speech**** — converts the generated project insight into spoken audio that can be played from the Project Details page.

- ****YouTube Data API**** — searches YouTube for relevant educational or project-related videos based on user-provided search queries and returns video information that can be displayed within the Digital Logbook.

The integration is implemented through the Digital Logbook backend. The React frontend communicates only with the application's own API; it does not call Gemini or YouTube directly and does not contain the external API keys.

This section documents the external API implementations that are currently present in the merged application.

**## Documentation Pages**

| Page | Purpose |

|---|---|

| [Gemini Project Progress](./gemini-project-progress.md) | Explains the progress-analysis flow, evidence, prompt constraints and response structure. |

| [Gemini Text-to-Speech](./gemini-text-to-speech.md) | Explains narration generation, speech requests and browser playback. |

| [YouTube API Integration](./youtube-api.md) | Explains YouTube video search, request handling, returned video information and integration with the Digital Logbook. |

| [Setup & Deployment](./setup-deployment.md) | Documents environment variables, local setup, secrets and deployment requirements. |

| [Testing & Failure Handling](./testing.md) | Documents mocks, timeout behaviour, provider failures and automated tests. |

**## Feature Location**

The AI features are available on the Project Details page.

The YouTube integration is available through the **Learning Videos** feature, which allows users to search for YouTube tutorials relevant to their project.

The AI user flow is:

```text

Open Project

```
|

v
```

Project Details

```
|

v
```

Explain My Progress

```
|

v
```

Digital Logbook backend calculates project evidence

```
|

v
```

Gemini interprets the supplied evidence

```
|

v
```

AI Project Insight displayed

```
|

v
```

Listen to Insight

```
|

v
```

Gemini generates speech audio

```
|

v
```

Pause / Resume / Replay

```

The YouTube search flow is:

```text

Open Project

```
|

v
```

Learning Videos

```
|

v
```

Enter search query

```
|

v
```

Digital Logbook backend

```
|

v
```

YouTube Data API

```
|

v
```

Video search results

```
|

v
```

Learning videos displayed to the user

```

**## Application Architecture**

```text

React Frontend

```
|

| authenticated Digital Logbook API request

v
```

Express Backend

```
|

+--> Project Details service/repository --> PostgreSQL

|

+--> AI Project Progress service -------> Gemini

|

+--> AI Project TTS service ------------> Gemini

|

+--> YouTube search service ------------> YouTube Data API
```

```

The database remains the source of truth for project and logbook information. Gemini is used only after the backend has loaded or received the information required for the requested AI operation.

The YouTube Data API is used to retrieve video search results. The backend controls the external API request and returns the required video information to the frontend.

**## Main Implementation Files**

**### Frontend**

```text

client/src/pages/Projects/AiProjectInsight.jsx

client/src/pages/Projects/ProjectDetails.jsx

client/src/pages/Projects/LearningVideos.jsx

client/src/api/projectDetailsApi.js

client/src/api/learningVideosApi.js

```

`AiProjectInsight.jsx` is rendered inside `ProjectDetails.jsx` and is responsible for the AI Project Coach interface, insight generation, speech generation and browser audio controls.

`LearningVideos.jsx` provides the user interface for searching for YouTube tutorials and displaying the returned learning videos.

**### Backend**

```text

server/controllers/projectDetailsController.js

server/services/aiProjectProgressService.js

server/services/aiProjectTtsService.js

server/services/youtubeSearchService.js

```

The project-details controller resolves the authenticated user and project before delegating the relevant external API work to the appropriate service.

`youtubeSearchService.js` handles the YouTube Data API request, validates the search configuration, applies the configured timeout and processes the returned video information.

**## YouTube API Configuration**

The YouTube integration uses the following server-side environment variables:

```text

YOUTUBE_API_KEY=

YOUTUBE_TIMEOUT_MS=10000

```

`YOUTUBE_API_KEY` contains the server-side YouTube API key.

`YOUTUBE_TIMEOUT_MS` controls how long the application waits for a YouTube search request before treating it as a timeout.

The API key is not exposed to the React frontend.

**## Digital Logbook API Endpoints**

| Method | Endpoint | Purpose |

|---|---|---|

| `POST` | `/api/projects/:projectId/ai-progress` | Generate a project-progress insight from the selected project's evidence. |

| `POST` | `/api/projects/:projectId/ai-progress/speech` | Generate speech from a structured AI project insight. |

| `GET` / `POST` | YouTube learning-video endpoint | Search YouTube for videos using the supplied search query. |

The AI endpoints are protected by the application's existing authentication middleware and project ownership checks.

The YouTube search implementation validates the request configuration and handles provider errors and timeout failures.

**## YouTube Search Behaviour**

The YouTube search service:

- Reads the API key from `YOUTUBE_API_KEY`.

- Uses `YOUTUBE_TIMEOUT_MS` or the service's default timeout when making the external request.

- Sends the search request to the YouTube Data API search endpoint.

- Converts the returned YouTube items into the application's video result format.

- Generates YouTube watch URLs using the returned video IDs.

- Returns `provider: "youtube"` with the search results.

If the YouTube API key is not configured, the application returns a configuration error rather than attempting an unauthorised request.

If the external request fails, the application returns an appropriate provider error.

If the request takes too long, the service returns a timeout error.

**## Security Boundary**

The Gemini and YouTube API keys are server-side configuration.

The frontend never needs to receive these keys. A normal user interacts with:

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

**## Testing**

The YouTube integration includes automated tests covering the external API service and frontend behaviour.

Relevant test files include:

```text

server/tests/youtubeSearchService.test.js

client/src/api/learningVideosApi.test.js

client/src/pages/Projects/LearningVideos.test.jsx

```

The tests cover successful video searches, YouTube API configuration failures, returned video URLs and frontend handling of provider errors.

**## No Database Migration**

The Gemini and YouTube integrations do not add database tables or columns.

The Gemini integration uses existing project and entry data, creates the AI evidence in memory, calls Gemini and returns the result to the frontend.

The YouTube integration sends the search query to the YouTube Data API and returns the relevant video information without requiring additional database storage.

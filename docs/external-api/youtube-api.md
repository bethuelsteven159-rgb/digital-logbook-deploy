# YouTube API Integration

Owner: Sino

## Overview

The **Learning Videos** feature lets users search YouTube for educational or project-related tutorials from inside the Digital Logbook. It uses the **YouTube Data API**, called only from the Digital Logbook backend.

The React frontend communicates only with the application's own API. It does not call YouTube directly and never receives the YouTube API key.

## Feature Location

The feature is available through **Learning Videos**, opened from a project.

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
Video search results
     |
     v
Learning videos displayed to the user
```

## Architecture

```text
React Frontend
     |
     | Digital Logbook API request
     v
Express Backend
     |
     +--> YouTube search service --> YouTube Data API
```

The backend controls the external API request and returns only the video information the frontend needs.

## Implementation Files

### Frontend

```text
client/src/pages/Projects/LearningVideos.jsx
client/src/api/learningVideosApi.js
```

- `LearningVideos.jsx` provides the search interface and displays the returned videos.
- `learningVideosApi.js` sends the search request to the Digital Logbook backend.

### Backend

```text
server/services/youtubeSearchService.js
```

`youtubeSearchService.js` handles the YouTube Data API request, validates the search configuration, applies the configured timeout and processes the returned video information.

## Configuration

The integration uses these server-side environment variables:

```text
YOUTUBE_API_KEY=
YOUTUBE_TIMEOUT_MS=10000
```

| Variable | Purpose |
|---|---|
| `YOUTUBE_API_KEY` | Server-side YouTube API key. |
| `YOUTUBE_TIMEOUT_MS` | How long the application waits for a YouTube search request before treating it as a timeout. Defaults to 10000 ms (10 seconds) when not set. |

The API key is not exposed to the React frontend. See [Setup & Deployment](/external-api/setup-deployment.md) for secrets and deployment requirements.

## API Endpoint

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/projects/:projectId/learning-videos` | Search YouTube for learning videos relevant to the selected project. |

The endpoint is protected by the application's existing authentication middleware. Before searching, the controller confirms that the project exists and belongs to the authenticated user.

**Query parameters**

| Parameter | Required | Description |
|---|---|---|
| `q` | No | The search query. If omitted, the project's name is used as the query. Extra whitespace is collapsed and the query is limited to 100 characters. |

**Successful response**

```json
{
  "success": true,
  "data": {
    "query": "string",
    "videos": [
      {
        "videoId": "string",
        "title": "string",
        "channel": "string",
        "thumbnail": "url|null",
        "publishedAt": "timestamp|null",
        "url": "https://www.youtube.com/watch?v=<videoId>"
      }
    ],
    "provider": "youtube",
    "cached": false
  }
}
```

`query` is the cleaned search term that was used, `videos` contains up to 5 results, and `cached` is `true` when the results came from the server's short-term cache (see Search Behaviour below).

## Search Behaviour

The YouTube search service:

- Cleans the search term: it trims it, collapses repeated whitespace and limits it to 100 characters. An empty term is rejected.
- Reads the API key from `YOUTUBE_API_KEY`.
- Uses `YOUTUBE_TIMEOUT_MS`, or the 10-second default, when making the external request.
- Sends a `GET` request to the YouTube Data API v3 search endpoint, asking for videos only, with the search term followed by the word "tutorial".
- Requests at most 5 results, with strict safe search, and only videos that can be embedded.
- Converts the returned YouTube items into the application's video result format (video ID, title, channel, thumbnail, publication date and watch URL), and skips any item without a video ID.
- Generates YouTube watch URLs from the returned video IDs.
- Returns `provider: "youtube"` with the search results.
- Keeps results in a short-term, in-memory cache for 10 minutes, keyed by the lowercase search term, so repeated searches do not use more of the YouTube API quota. Cached responses have `cached: true`. The cache is not stored in the database and is cleared when the server restarts.

The service accepts optional overrides for the API key, timeout, fetch function and current time, so tests can run it without making real YouTube requests.

## Failure Handling

| Situation | Status | Message |
|---|---|---|
| No search term | `400` | A search term is required. |
| `YOUTUBE_API_KEY` is not configured | `503` | YouTube search is not configured. |
| YouTube returns `403` (for example, quota exceeded) or `429` | `503` | YouTube search is temporarily unavailable. Please try again later. |
| Any other unsuccessful YouTube response | `502` | YouTube search is temporarily unavailable. |
| The request exceeds the timeout | `504` | YouTube search took too long. Please try again. |

No request is made to YouTube when the search term is empty or the API key is missing.

When YouTube returns an unsuccessful response, the server logs the status and the first 500 characters of the response body to the server console. These details are not sent to the browser.

The frontend handles these provider errors and shows them to the user.

## Security Boundary

```text
Browser -> Digital Logbook backend -> YouTube Data API
```

rather than:

```text
Browser -> YouTube Data API
```

This keeps the API key out of the frontend bundle and browser storage.

## Testing

```text
server/tests/youtubeSearchService.test.js
client/src/api/learningVideosApi.test.js
client/src/pages/Projects/LearningVideos.test.jsx
```

The tests cover:

- Successful video searches.
- YouTube API configuration failures.
- Returned video URLs.
- Frontend handling of provider errors.

See [Testing & Failure Handling](/external-api/testing.md) for the wider testing approach.

## No Database Migration

The YouTube integration adds no database tables or columns. The search query is sent to the YouTube Data API and the relevant video information is returned without additional storage.

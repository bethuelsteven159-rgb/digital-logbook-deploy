# External API Testing & Failure Handling

Owner: Morare & Sino

## Testing Strategy

The automated test suite mocks Gemini and YouTube instead of making live provider requests.

This keeps the tests independent of:

- internet availability;
- Gemini and YouTube availability;
- API quota;
- real API credentials; and
- external response time.

The tests verify the Digital Logbook's behaviour when a provider succeeds, fails, returns malformed data or exceeds the configured timeout.

## Backend — AI Project Progress

Test file:

```text
server/tests/aiProjectProgressService.test.js
```

The current tests cover:

- factual project evidence calculation without AI;
- local fallback when there is no activity;
- successful structured Gemini output;
- Gemini rate-limit handling;
- malformed AI JSON;
- unexpected AI response structure; and
- timeout/abort behaviour.

## Backend — Text-to-Speech

Test file:

```text
server/tests/aiProjectTtsService.test.js
```

The current tests cover:

- narration construction;
- rejection of incomplete insight data;
- successful inline audio;
- audio returned through an Interactions API step;
- provider unavailability;
- provider rate limits;
- successful responses that contain no audio; and
- TTS timeout/abort behaviour.

## Backend — YouTube Search

Test file:

```text
server/tests/youtubeSearchService.test.js
```

The current tests cover:

- successful video searches;
- generated YouTube watch URLs from returned video IDs; and
- YouTube API configuration failures (missing API key).

## Frontend — AI Project Coach

Test file:

```text
client/src/pages/Projects/AiProjectInsight.test.jsx
```

The component tests cover the user-facing AI flow, including successful insight generation, speech behaviour and friendly error states.

## Frontend — Learning Videos

Test file:

```text
client/src/pages/Projects/LearningVideos.test.jsx
```

The component tests cover the Learning Videos interface, including displaying search results and handling provider errors.

## Frontend — API Helpers

Test files:

```text
client/src/api/projectDetailsAiApi.test.js
client/src/api/learningVideosApi.test.js
```

The AI API-helper tests cover:

- authenticated progress requests;
- speech requests containing the generated insight;
- missing authentication; and
- backend failure messages.

The Learning Videos API-helper tests cover requests to the learning-videos endpoint and the handling of backend responses and failures.

## Failure Handling

### Project Progress

| Failure | Application behaviour |
|---|---|
| Gemini API key missing | Backend returns `503`. |
| Gemini returns `429` | Backend maps it to a retryable `503` message. |
| Other unsuccessful Gemini response | Backend returns `502`. |
| Empty Gemini response | Backend returns `502`. |
| Invalid JSON | Backend returns `502`. |
| Unexpected response structure | Backend returns `502`. |
| Analysis timeout | Backend returns `504`. |
| No usable project activity | Local fallback is returned without calling Gemini. |

### Text-to-Speech

| Failure | Application behaviour |
|---|---|
| Gemini API key missing | Backend returns `503`. |
| Gemini returns `429` | Backend returns a retryable `503`. |
| Gemini returns `503` | Backend returns a retryable `503`. |
| Other unsuccessful provider response | Backend returns `502`. |
| Successful response contains no audio | Backend returns `502`. |
| TTS timeout | Backend returns `504`. |

### YouTube Learning Videos

| Failure | Application behaviour |
|---|---|
| No search term | Backend returns `400`. |
| `YOUTUBE_API_KEY` missing | Backend returns `503` instead of making an unauthorised request. |
| YouTube returns `403` (for example quota exceeded) or `429` | Backend returns a retryable `503`. |
| Other unsuccessful YouTube response | Backend returns `502`. |
| YouTube request exceeds the timeout | Backend returns `504`. |

## Separate Timeouts

Progress analysis, speech generation and video search do not use the same practical response-time limit.

The progress service reads:

```text
GEMINI_TIMEOUT_MS
```

and contains a 10-second internal default.

The speech service reads:

```text
GEMINI_TTS_TIMEOUT_MS
```

and contains a 45-second internal default.

The longer TTS timeout reflects the fact that audio generation can take longer than a text response.

The YouTube search service reads:

```text
YOUTUBE_TIMEOUT_MS
```

and falls back to a 10-second internal default when it is not supplied.

## Frontend Error Behaviour

`AiProjectInsight.jsx` maps backend failures to user-facing messages.

For project analysis, the interface distinguishes:

- temporary AI-service failure;
- timeout; and
- general request errors.

For speech, the interface distinguishes:

- temporary speech-service failure;
- timeout; and
- audio playback failure.

`LearningVideos.jsx` handles YouTube provider errors and shows them to the user.

In all cases, the rest of the Project Details page remains available when an external provider fails.

## Running the Automated Tests

Backend:

```bash
cd server
npm test
```

Frontend:

```bash
cd client
npm test
```

The full test suites should be run after external API changes, not only the external-API-specific test files, because the features share Project Details routes, controllers, API helpers and UI code with existing application behaviour.

## Manual Acceptance Test

A final manual check should confirm:

1. Sign in to the Digital Logbook.
2. Open a project containing entries.
3. Select **Explain My Progress**.
4. Confirm that the displayed evidence matches the selected project.
5. Confirm that headline, summary, focus areas, trend and next step are shown.
6. Select **Listen to Insight**.
7. Confirm that speech is generated and begins playing.
8. Pause and resume the audio.
9. Allow the audio to finish and confirm replay works.
10. Open a project with little or no activity and confirm the insufficient-data fallback.
11. Open **Learning Videos** for a project and search for a topic.
12. Confirm that video results are displayed and that each video opens the correct YouTube watch page.
13. Search with no text entered and confirm that results based on the project name are shown.
14. Confirm that provider failures/timeouts show a retryable message rather than breaking Project Details.

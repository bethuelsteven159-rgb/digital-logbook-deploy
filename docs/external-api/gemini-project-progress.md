# Gemini Project Progress

Owner: Morare

## Purpose

AI Project Progress provides a short interpretation of the activity already recorded inside one Digital Logbook project.

The feature does not allow Gemini to become the source of truth for project statistics. The backend calculates the factual evidence first and then asks Gemini to interpret that evidence.

The user starts the feature by selecting **Explain My Progress** on the Project Details page.

## Request Flow

```text
AiProjectInsight.jsx
    |
    v
fetchAiProjectProgress(projectId)
    |
    v
POST /api/projects/:projectId/ai-progress
    |
    v
getAiProjectProgress
    |
    v
getProjectDetailsService({ projectId, userId })
    |
    v
generateProjectProgressInsight(projectDetails)
    |
    v
Google Gemini generateContent
```

## Authentication and Project Ownership

`getAiProjectProgress` obtains the authenticated user ID and loads the selected project with:

```text
projectId + authenticated userId
```

The external request is therefore made only after the application has resolved the project through its normal ownership-aware project-details service.

## Backend Evidence

`server/services/aiProjectProgressService.js` builds an evidence object from the project details before the external request is sent.

The evidence contains:

| Evidence field | Meaning |
|---|---|
| `projectName` | Name of the selected project. |
| `projectDescription` | Project description, truncated before inclusion. |
| `totalEntries` | Total number of project entries. |
| `loggedMinutes` | Total logged project time in minutes. |
| `lastActivity` | Most recent recorded activity date available in project statistics. |
| `entriesLast7Days` | Entries recorded during the most recent seven-day window. |
| `entriesPrevious7Days` | Entries recorded during the preceding seven-day window. |
| `unfinishedEntries` | Entries without a completion timestamp. |
| `overdueEntries` | Unfinished entries with a due date earlier than the current time. |
| `recentEntries` | A limited list of the most recent entries used as supporting context. |

## Recent Entry Evidence

The service sorts entries by their activity date and includes at most the **12 most recent entries**.

For each included entry, the evidence can contain:

```text
name
occurredAt
durationMinutes
completed
dueAt
tags
fields
```

To keep the request focused and bounded, the service also limits:

- tags to the first 6 per recent entry;
- custom field values to the first 4 per recent entry;
- long entry/project text through truncation; and
- focus areas in the AI response to a maximum of 4.

## Prompt Constraints

The Gemini prompt explicitly tells the model to:

- use only the supplied project evidence;
- never invent statistics, entries, tasks, deadlines, completion states or project facts;
- treat the metrics calculated by the application as factual;
- not claim work is complete unless the supplied evidence supports that claim;
- not make assumptions about missing information;
- keep the response concise, encouraging and useful to a university student; and
- base the suggested next step only on unfinished work, overdue work, recent activity and the project description.

The model is therefore used for interpretation, while the Digital Logbook remains responsible for factual calculations.

## Gemini Request

The service calls the Gemini `generateContent` endpoint.

The model is selected from:

```text
GEMINI_MODEL
```

The merged `.env.example` currently sets:

```env
GEMINI_MODEL=gemini-3.1-flash-lite
```

If `GEMINI_MODEL` is not configured, the service contains its own fallback model value.

The request asks Gemini to return JSON and supplies a response schema for:

```json
{
  "headline": "string",
  "summary": "string",
  "focusAreas": ["string"],
  "trend": {
    "direction": "up | steady | down | insufficient",
    "label": "string",
    "explanation": "string"
  },
  "nextStep": {
    "title": "string",
    "reason": "string"
  }
}
```

The backend validates the response before it is returned to the frontend.

## Successful Application Response

A successful AI-backed result has the following shape:

```json
{
  "success": true,
  "data": {
    "insight": {
      "headline": "...",
      "summary": "...",
      "focusAreas": ["..."],
      "trend": {
        "direction": "steady",
        "label": "...",
        "explanation": "..."
      },
      "nextStep": {
        "title": "...",
        "reason": "..."
      }
    },
    "evidence": {
      "projectName": "...",
      "totalEntries": 0,
      "loggedMinutes": 0
    },
    "provider": "gemini",
    "model": "..."
  }
}
```

The frontend uses both the structured `insight` and the factual `evidence`.

## Insufficient Activity

If the project has no entries or no usable recent-entry evidence, the service does not call Gemini.

Instead it returns a local fallback result:

```text
provider: local-insufficient-data
```

The fallback tells the user that there is not enough activity for a meaningful analysis and encourages them to continue logging work.

This avoids an unnecessary external request and avoids presenting an AI interpretation where the application has no supporting activity.

## Frontend Presentation

`AiProjectInsight.jsx` presents the result as the **AI Project Coach**.

The interface displays:

- progress headline;
- summary;
- focus areas;
- momentum/activity trend;
- next best move; and
- a compact evidence summary based on the backend-calculated project activity.

The user can request the insight again using **Refresh Insight**.

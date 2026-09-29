# External API Setup & Deployment

Owner: Morare

## Local Environment

Gemini configuration belongs in the backend environment.

For local development, values are stored in:

```text
server/.env
```

Real secrets must not be committed to Git.

The merged project uses the following Gemini-related environment variables:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Server-side credential used to authenticate Gemini requests. |
| `GEMINI_MODEL` | Model used for AI Project Progress. |
| `GEMINI_TTS_MODEL` | Model used for text-to-speech generation. |
| `GEMINI_TIMEOUT_MS` | Timeout for project-progress generation. |
| `GEMINI_TTS_TIMEOUT_MS` | Optional timeout for speech generation. The TTS service defaults to 45000 ms when it is not supplied. |

A local configuration can contain:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TTS_MODEL=gemini-3.8-flash-lite-tts
GEMINI_TIMEOUT_MS=10000
GEMINI_TTS_TIMEOUT_MS=45000
```

The real value of `GEMINI_API_KEY` must remain private.

## Current `.env.example`

The merged repository documents the main Gemini configuration in:

```text
server/.env.example
```

Developers should copy the required values into their own `server/.env` without replacing the rest of their local database and authentication configuration.

## Local Testing Setup

A teammate testing the feature locally needs:

1. the current application code;
2. the normal Digital Logbook backend configuration;
3. access to the application's PostgreSQL database or an appropriate local development setup;
4. a valid Gemini API key in `server/.env`; and
5. the Gemini model configuration shown above.

After starting the backend and frontend, the tester can open any accessible project and use **Explain My Progress**.

For a project with generated insight data, **Listen to Insight** can then be used to test speech generation.

## Secret Handling

The real Gemini API key must not be placed in:

- Git commits;
- `.env.example`;
- frontend files;
- documentation;
- screenshots;
- pull-request descriptions; or
- public chat/messages.

Only the backend needs the key.

A teammate who needs to test locally can receive the key through the team's private secret-sharing method and store it in their own local `.env`.

## Deployment

The deployed backend must receive the Gemini variables as server-side environment variables/secrets.

The deployed architecture is:

```text
User Browser
    |
    v
Deployed Frontend
    |
    v
Deployed Backend
    |
    +--> PostgreSQL
    |
    +--> Gemini
```

End users do not need their own Gemini account or API key. They use the Digital Logbook normally, while the deployed backend uses the server's configured Gemini key.

## Database Dependency

AI Project Progress depends on project data being available before the Gemini request is made.

The sequence is:

```text
Authenticated request
    |
    v
Load project details from PostgreSQL
    |
    v
Calculate evidence
    |
    v
Call Gemini
```

Therefore, a database connection failure can stop the AI feature before Gemini is reached.

The external API integration does not require a new database schema and does not require a special AI-specific database connection module. It uses the application's existing project-details data access.

## Shared Provider Quota

A deployed backend uses one configured Gemini credential for its requests.

This means provider quota or rate limits associated with that credential can affect multiple users of the deployed application.

The application handles provider failures, but the deployment owner should still monitor the configured API key and its usage.

## Deployment Verification

After deployment, verify that:

- the backend can access PostgreSQL;
- the backend has `GEMINI_API_KEY`;
- **Explain My Progress** works for a project with activity;
- a project with insufficient activity returns the local fallback;
- **Listen to Insight** returns playable audio;
- pause, resume and replay work;
- provider failures return user-friendly messages; and
- the Gemini key is not present in browser storage or frontend source output.

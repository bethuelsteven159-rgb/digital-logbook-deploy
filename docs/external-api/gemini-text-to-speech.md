# Gemini Text-to-Speech

Owner: Morare

## Purpose

The text-to-speech feature allows the user to listen to the AI Project Insight generated for a project.

The speech option is available after an insight has been generated. The user selects **Listen to Insight**, and the backend requests speech audio from Gemini.

## Request Flow

```text
Generated AI Project Insight
    |
    v
Listen to Insight
    |
    v
fetchAiProjectSpeech(projectId, insight)
    |
    v
POST /api/projects/:projectId/ai-progress/speech
    |
    v
getAiProjectSpeech
    |
    +--> verify authenticated project access
    |
    v
generateInsightSpeech(insight)
    |
    v
Gemini Interactions API
    |
    v
Base64 audio + MIME type
    |
    v
Browser Audio object
```

## Speech Endpoint

```text
POST /api/projects/:projectId/ai-progress/speech
```

The request body contains the structured insight:

```json
{
  "insight": {
    "headline": "...",
    "summary": "...",
    "focusAreas": ["..."],
    "trend": {
      "direction": "...",
      "label": "...",
      "explanation": "..."
    },
    "nextStep": {
      "title": "...",
      "reason": "..."
    }
  }
}
```

The controller rejects the request when `insight` is missing or is not an object.

Before calling Gemini, the controller also loads the selected project using the authenticated `userId`. This means the speech route keeps the same project-access boundary as the rest of Project Details.

## Narration Construction

`server/services/aiProjectTtsService.js` turns the structured insight into a short narration.

The narration can include:

- the insight headline;
- the progress summary;
- current focus areas;
- the activity/momentum explanation; and
- the next best move.

The generated narration is limited to **2500 characters** before it is sent to the external service.

## Gemini TTS Configuration

The TTS model is selected from:

```text
GEMINI_TTS_MODEL
```

The merged environment example configures:

```env
GEMINI_TTS_MODEL=gemini-3.8-flash-lite-tts
```

The service uses the voice:

```text
Charon
```

and requests a clear, calm, professional and encouraging delivery at a natural pace.

The speech request is sent through the Gemini Interactions API with an audio response format.

## Returned Audio

The service supports audio found either:

- in top-level output audio; or
- inside a content item returned by an Interactions API step.

The backend returns the audio as Base64 data with its MIME type, model and voice.

Example application response:

```json
{
  "success": true,
  "data": {
    "audio": "<base64-audio>",
    "mimeType": "audio/wav",
    "model": "...",
    "voice": "Charon"
  }
}
```

## Browser Playback

The frontend creates an `Audio` object from the returned Base64 audio.

The button state changes according to playback:

```text
Listen to Insight
      |
      v
Playing -> Pause
      |
      v
Paused -> Resume
      |
      v
Ended -> Replay
```

If automatic playback is blocked by the browser, the component keeps the generated audio ready so that the user can start it manually.

The component also stops and clears its audio object when it is unmounted.

## TTS Data Boundary

The TTS service sends narration generated from the structured AI insight.

It does not resend the complete project evidence object during the speech request.

The Digital Logbook authentication token, database credentials and Gemini API key are not included in the narration.

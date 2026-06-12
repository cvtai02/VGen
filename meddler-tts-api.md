# Text-to-Speech API

Synthesize speech from text using one of your saved provider connections
(ElevenLabs or Soniox). Returns an MP3 audio stream.

Base URL: `https://meddler.minfect.com`.

## Authentication

Send your system secret as a bearer token. No login or session cookie is
required.

    Authorization: Bearer $SYSTEM_SECRET

## Endpoint

    POST https://meddler.minfect.com/api/tts

## Example

    curl -X POST "https://meddler.minfect.com/api/tts" \
      -H "Authorization: Bearer $SYSTEM_SECRET" \
      -H "Content-Type: application/json" \
      -d '{
        "accountId": 1,
        "text": "[excited] Hello from Meddler! [whispers] This is text to speech.",
        "voice": "21m00Tcm4TlvDq8ikWAM",
        "stability": "natural"
      }' \
      --output speech.mp3

## Request body

| Field      | Type   | Required | Notes |
| ---------- | ------ | -------- | ----- |
| accountId  | number | yes      | Connection id of the provider connection to use. |
| text       | string | yes      | Up to 5000 characters. ElevenLabs supports inline audio tags such as [excited] or [whispers]. |
| voice      | string | no       | Voice id. Falls back to the provider default if omitted. |
| stability  | string | no       | ElevenLabs only — creative, natural, or robust. |
| language   | string | no       | Soniox only — language code such as en. The voice must support it. |

## Response

On success: `200 OK` with `Content-Type: audio/mpeg` — the raw MP3 bytes
(write them to a file or pipe to a player). Errors return JSON, e.g.
`{ "error": "account not found" }`.

| Status | Meaning |
| ------ | ------- |
| 200    | MP3 audio body. |
| 400    | Invalid JSON, missing text, or text over 5000 chars. |
| 401    | Missing or invalid bearer token. |
| 404    | No connection matches accountId. |
| 500    | Upstream provider error during synthesis. |

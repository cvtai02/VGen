# Handoff: Threads Scrape API

## Summary

New `POST /api/threads/scrape` endpoint added to VGen. Scrapes a Threads post and returns structured blocks suitable for video rendering.

## API Contract

### `POST /api/threads/scrape`

**Auth:** Bearer token required (standard VGen auth).

**Request body:**

```json
{
  "url": "https://www.threads.net/@username/post/ABC123"
}
```

**Success response (200):**

```json
{
  "blocks": [
    {
      "text": "Post content...",
      "isMain": true,
      "author": "username",
      "avatarUrl": "https://...",
      "score": 42,
      "createdAt": 1719360000,
      "media": {
        "type": "image",
        "items": [{ "type": "image", "imageUrl": "https://...", "videoUrl": null, "width": 1080, "height": 1080 }]
      }
    },
    {
      "text": "Reply content...",
      "isMain": false,
      "author": "replier",
      "avatarUrl": "https://...",
      "score": 5,
      "createdAt": 1719363600,
      "media": null
    }
  ],
  "post": {
    "username": "username",
    "fullName": "Display Name",
    "text": "Post content...",
    "likeCount": 42,
    "replyCount": 3,
    "repostCount": 1,
    "takenAt": 1719360000,
    "profilePicUrl": "https://...",
    "isVerified": false,
    "code": "ABC123",
    "media": null
  },
  "replyCount": 3
}
```

**Error responses:**

- `400` — Missing or invalid Threads URL
- `401` — Missing or invalid bearer token
- `500` — Scrape failed (post private, unavailable, or timed out)

## Implementation Details

- New module: `app/src/modules/threads/`
- Use case spawns `scripts/threads-scrape.mjs` via `child_process.execFile` (Playwright headless Chrome)
- Script copied from EveryMinute project, requires `playwright` package (added to workspace root)
- 40-second timeout per scrape

## UI Follow-up

The EveryMinute frontend (`/threads` page) already calls this endpoint. The UI needs to authenticate with VGen before making API calls — either by logging in with `SYSTEM_SECRET` or by making the threads endpoint public.

**Decision needed:** Should `/api/threads/scrape` bypass auth (add to the allowlist in `server.ts`) or should EveryMinute authenticate with VGen?

import { BookOpen, CheckCircle2, Clock3, Code2, FileImage, LockKeyhole, UploadCloud, Send, RefreshCw, Users } from "lucide-react";
import { apiBaseUrl } from "../api/clients.js";
import "../styles/usecases.css";

const authCode = `Authorization: Bearer <system-token>`;

const renderCode = `POST ${apiBaseUrl}/api/zhihugen/render
Content-Type: application/json

{
  "blocks": [
    { "text": "First narration line" },
    { "text": "Second narration line" }
  ],
  "title": "episode-001",
  "caption": "optional caption text",
  "telegramDestinations": ["dest-id-1"],
  "previewBeforeUpload": true
}`;

const curlCode = `curl -X POST "${apiBaseUrl}/api/zhihugen/render" \\
  -H "Authorization: Bearer <system-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "blocks": [
      { "text": "First narration line" },
      { "text": "Second narration line" }
    ],
    "title": "episode-001",
    "previewBeforeUpload": true
  }'`;

const responseDirectCode = `// previewBeforeUpload: false (default)
200 { "absolutePath": "CloudflareR2/.../video.mp4" }`;

const responsePreviewCode = `// previewBeforeUpload: true
202 { "jobId": "job_20260622_...", "status": "awaiting_upload" }`;

const jobCode = `GET  /api/zhihugen/jobs                      List jobs (latest 100)
GET  /api/zhihugen/jobs/:id                  Get single job
GET  /api/zhihugen/jobs/:id/wait             Long-poll until done (max 5 min)
GET  /api/zhihugen/jobs/:id/events           Pipeline events (step timings)
GET  /api/zhihugen/jobs/:id/preview          Stream rendered MP4 (awaiting_upload only)
POST /api/zhihugen/jobs/:id/confirm-upload   Upload previewed file to storage + telegram
POST /api/zhihugen/jobs/:id/discard          Discard without uploading
POST /api/zhihugen/jobs/:id/cancel           Cancel pending or awaiting job
POST /api/zhihugen/jobs/:id/resend           Resend completed video to Telegram`;

const jobResponseCode = `// GET /api/zhihugen/jobs/:id
{
  "jobId": "job_20260622_...",
  "status": "completed",
  "label": "episode-001",
  "absolutePath": "CloudflareR2/.../video.mp4",
  "cdnUrl": "https://...",
  "telegram": [
    { "provider": "telegram", "status": "sent", "botName": "...", "link": "..." }
  ]
}`;

const telegramDestinationsCode = `GET /api/settings/telegram`;

const telegramDestinationsResponseCode = `// GET /api/settings/telegram
{
  "bots": [
    {
      "id": "tg_bot_...",
      "name": "My Bot",
      "username": "my_bot",
      "hasBotToken": true,
      "destinations": [
        {
          "id": "tg_dest_abc123",
          "chatId": "-1001234567890",
          "name": "My Channel",
          "type": "channel",
          "username": "my_channel"
        }
      ]
    }
  ]
}`;

const eventsResponseCode = `// GET /api/zhihugen/jobs/:id/events
[
  { "step": "images_generation", "status": "completed", "createdAt": "..." },
  { "step": "download_resources", "status": "completed", "metadata": { "cacheHit": true } },
  { "step": "tts", "status": "completed", "createdAt": "..." },
  { "step": "rendering", "status": "completed", "createdAt": "..." },
  { "step": "upload", "status": "completed", "metadata": { "absolutePath": "..." } },
  { "step": "telegram", "status": "completed", "createdAt": "..." }
]`;

const renderFieldsTable = [
  { field: "blocks", type: "TextBlock[]", required: true, desc: "Array of { text, author? }. One block per scene." },
  { field: "title", type: "string", required: true, desc: "Video title, also used as the job label." },
  { field: "caption", type: "string", required: false, desc: "Caption text included in Telegram delivery." },
  { field: "telegramDestinations", type: "string[]", required: false, desc: "Destination IDs to send to. Omit for all configured destinations." },
  { field: "previewBeforeUpload", type: "boolean", required: false, desc: "When true, returns 202 and waits for confirm-upload. Default: false." },
];

const pipelineSteps = [
  { step: "images_generation", desc: "Render text blocks to thread images" },
  { step: "tts + download_resources", desc: "Text-to-speech and background video download run in parallel" },
  { step: "rendering", desc: "FFmpeg compositing into final MP4" },
  { step: "upload", desc: "Upload to 7router storage (skipped until confirm-upload for preview jobs)" },
  { step: "telegram", desc: "Deliver caption + routing info to Telegram destinations" },
];

export function UsecasesPage() {
  return (
    <section className="panel usecases-page">
      <header className="page-header usecases-header">
        <div>
          <h1 className="page-title">Usecases</h1>
          <p className="page-subtitle">API reference for external applications that call VGen.</p>
        </div>
        <div className="usecases-base">
          <span>Base URL</span>
          <code>{apiBaseUrl}</code>
        </div>
      </header>

      <div className="usecase-layout">
        <aside className="usecase-index">
          <a href="#zhihugen"><BookOpen size={15} /> Zhihugen API</a>
          <a href="#newsgen"><Clock3 size={15} /> Newsgen</a>
        </aside>

        <div className="usecase-content">
          <article className="usecase-card" id="zhihugen">
            <div className="usecase-card-header">
              <div>
                <span className="usecase-kicker">Usecase 1</span>
                <h2>Zhihugen API</h2>
              </div>
              <span className="usecase-status live"><CheckCircle2 size={13} /> Ready</span>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><LockKeyhole size={15} /> Authentication</div>
              <p>All endpoints require a bearer token. Use the system token from Settings.</p>
              <pre>{authCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><FileImage size={15} /> Create a render</div>
              <p>Submit a JSON body with text blocks. Each block becomes one scene with generated image and TTS narration.</p>
              <pre>{renderCode}</pre>
              <table className="usecase-fields-table">
                <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
                <tbody>
                  {renderFieldsTable.map((f) => (
                    <tr key={f.field}>
                      <td><code>{f.field}</code></td>
                      <td><code>{f.type}</code></td>
                      <td>{f.required ? "Yes" : "No"}</td>
                      <td>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <pre>{curlCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><Code2 size={15} /> Response</div>
              <p>Direct renders return the storage path immediately. Preview renders return a job ID for the confirm-upload flow.</p>
              <pre>{responseDirectCode}</pre>
              <pre>{responsePreviewCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><Users size={15} /> Telegram destinations</div>
              <p>Fetch configured bots and their destinations. Use a destination <code>id</code> in the <code>telegramDestinations</code> array when creating a render. Omit the array to send to all destinations.</p>
              <pre>{telegramDestinationsCode}</pre>
              <pre>{telegramDestinationsResponseCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><RefreshCw size={15} /> Pipeline</div>
              <p>Each render goes through these steps. Track progress via the events endpoint.</p>
              <table className="usecase-fields-table">
                <thead><tr><th>Step</th><th>Description</th></tr></thead>
                <tbody>
                  {pipelineSteps.map((s) => (
                    <tr key={s.step}>
                      <td><code>{s.step}</code></td>
                      <td>{s.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <pre>{eventsResponseCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><UploadCloud size={15} /> Job endpoints</div>
              <p>Manage jobs: list, poll, preview the rendered video, confirm upload, discard, cancel, or resend to Telegram.</p>
              <pre>{jobCode}</pre>
              <pre>{jobResponseCode}</pre>
            </div>
          </article>

          <article className="usecase-card usecase-card-muted" id="newsgen">
            <div className="usecase-card-header">
              <div>
                <span className="usecase-kicker">Usecase 2</span>
                <h2>Newsgen</h2>
              </div>
              <span className="usecase-status upcoming"><Clock3 size={13} /> Upcoming</span>
            </div>
            <p className="usecase-upcoming-copy">
              API contract is not published yet. This section is reserved for the upcoming Newsgen workflow, including
              request fields, generation status, and output delivery endpoints.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

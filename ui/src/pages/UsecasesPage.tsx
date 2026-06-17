import { BookOpen, CheckCircle2, Clock3, Code2, FileImage, LockKeyhole, UploadCloud } from "lucide-react";
import { apiBaseUrl } from "../api/clients.js";
import "../styles/usecases.css";

const authCode = `Authorization: Bearer <system-token>`;

const renderCode = `POST ${apiBaseUrl}/api/zhihugen/render
Authorization: Bearer <system-token>
Content-Type: multipart/form-data

images=<file>            repeat for every scene image
scripts=<text>           repeat to match image order
label=<video label>
previewBeforeUpload=true`;

const curlCode = `curl -X POST "${apiBaseUrl}/api/zhihugen/render" \\
  -H "Authorization: Bearer <system-token>" \\
  -F "label=episode-001" \\
  -F "previewBeforeUpload=true" \\
  -F "images=@scene-1.png" \\
  -F "scripts=First narration line" \\
  -F "images=@scene-2.png" \\
  -F "scripts=Second narration line"`;

const responseCode = `Response 200
{
  "absolutePath": "CloudflareR2/.../video.mp4"
}

Response 202 when previewBeforeUpload=true
{
  "jobId": "zhihugen_...",
  "status": "awaiting_upload"
}`;

const jobCode = `GET  ${apiBaseUrl}/api/zhihugen/jobs
GET  ${apiBaseUrl}/api/zhihugen/jobs/:id
GET  ${apiBaseUrl}/api/zhihugen/jobs/:id/wait
GET  ${apiBaseUrl}/api/zhihugen/jobs/:id/preview
POST ${apiBaseUrl}/api/zhihugen/jobs/:id/confirm-upload
POST ${apiBaseUrl}/api/zhihugen/jobs/:id/discard`;

export function UsecasesPage() {
  return (
    <section className="panel usecases-page">
      <header className="page-header usecases-header">
        <div>
          <h1 className="page-title">Usecases</h1>
          <p className="page-subtitle">API notes for external applications that call VGen.</p>
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
              <div className="usecase-step-title"><LockKeyhole size={15} /> Bearer token</div>
              <p>External apps use the system token directly as the bearer token on every protected API call.</p>
              <pre>{authCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><FileImage size={15} /> Create a render</div>
              <p>Submit multipart form data. Use one `images` file per scene and repeat `scripts` in the same order.</p>
              <pre>{renderCode}</pre>
              <pre>{curlCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><Code2 size={15} /> Render response</div>
              <p>Without preview mode the API uploads immediately. With preview mode it stores a local preview and returns a job id.</p>
              <pre>{responseCode}</pre>
            </div>

            <div className="usecase-step">
              <div className="usecase-step-title"><UploadCloud size={15} /> Job and preview endpoints</div>
              <p>Use `wait` for long polling, `preview` to stream the MP4, and `confirm-upload` to push the previewed file to storage.</p>
              <pre>{jobCode}</pre>
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

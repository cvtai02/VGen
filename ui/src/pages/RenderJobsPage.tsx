import { RefreshCw, ArrowLeft, Upload, X, Copy, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { zhihugenClient, type ZhihugenJobDto } from "../api/clients.js";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed" ? "badge badge-completed" :
    status === "failed" ? "badge badge-failed" :
    status === "awaiting_upload" ? "badge" :
    "badge badge-pending";
  const style = status === "awaiting_upload" ? { background: "var(--accent)", color: "#fff" } : undefined;
  return <span className={cls} style={style}>{status.replace("_", " ")}</span>;
}

function JobDetail({
  job: initial,
  onBack,
  onUpdated,
}: {
  job: ZhihugenJobDto;
  onBack: () => void;
  onUpdated: (job: ZhihugenJobDto) => void;
}) {
  const [job, setJob] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    if (job.status !== "awaiting_upload") {
      setPreviewSrc("");
      return;
    }

    let objectUrl = "";
    zhihugenClient.previewBlob(job.jobId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Preview failed."));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [job.jobId, job.status]);

  async function refresh() {
    const updated = await zhihugenClient.getJob(job.jobId);
    setJob(updated);
    onUpdated(updated);
  }

  async function confirmUpload() {
    setError("");
    setUploading(true);
    try {
      const result = await zhihugenClient.confirmUpload(job.jobId);
      await refresh();
      if (result.cdnUrl || result.absolutePath) {
        setJob((j) => ({ ...j, status: "completed", absolutePath: result.absolutePath, cdnUrl: result.cdnUrl }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function discard() {
    setError("");
    try {
      await zhihugenClient.discardJob(job.jobId);
      setJob((j) => ({ ...j, status: "failed" }));
      onUpdated({ ...job, status: "failed" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discard failed.");
    }
  }

  return (
    <section className="panel">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <StatusBadge status={job.status} />
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="form-section-label">Job</div>
      <div className="form-group">
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{job.jobId}</div>
        {job.label && <div style={{ fontSize: 15, fontWeight: 600 }}>{job.label}</div>}
      </div>

      {job.status === "awaiting_upload" && (
        <>
          <div className="form-section-label">Preview</div>
          {previewSrc && (
            <video
              src={previewSrc}
              controls
              style={{ width: "100%", maxHeight: 480, borderRadius: 6, background: "#000", display: "block" }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={confirmUpload} disabled={uploading}>
              {uploading
                ? <><Loader size={13} className="spin" /> Uploading…</>
                : <><Upload size={13} /> Upload to storage</>}
            </button>
            <button className="btn btn-danger-ghost" onClick={discard} disabled={uploading}>
              <X size={13} /> Discard
            </button>
          </div>
        </>
      )}

      {job.status === "completed" && (
        <>
          {job.cdnUrl && (
            <>
              <div className="form-section-label">Video</div>
              <video
                src={job.cdnUrl}
                controls
                style={{ width: "100%", maxHeight: 480, borderRadius: 6, background: "#000", display: "block" }}
              />
            </>
          )}
          {job.absolutePath && (
            <div className="job-result" style={{ marginTop: 12 }}>
              <div className="job-result-detail">
                <div className="job-result-path">{job.absolutePath}</div>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 6, alignSelf: "flex-start" }}
                  onClick={() => navigator.clipboard.writeText(job.absolutePath!)}
                >
                  <Copy size={12} /> Copy path
                </button>
              </div>
            </div>
          )}
          {job.telegram && job.telegram.length > 0 && (
            <div className="job-result" style={{ marginTop: 12 }}>
              <div className="form-section-label">Telegram</div>
              <div className="job-result-detail">
                {job.telegram.map((telegram, index) => (
                  <div key={`${telegram.destinationId ?? telegram.chatId ?? index}-${index}`} className="job-result-row">
                    <span className={telegram.status === "sent" ? "badge badge-completed" : "badge badge-failed"}>
                      {telegram.status}
                    </span>
                    <span className="job-result-path">
                      {telegram.destinationName ?? telegram.chatId ?? "Telegram"}
                      {telegram.status === "sent" && telegram.messageId ? ` as message ${telegram.messageId}` : ""}
                      {telegram.status === "failed" && telegram.error ? `: ${telegram.error}` : ""}
                    </span>
                    {telegram.link && (
                      <a className="job-open-link" href={telegram.link} target="_blank" rel="noopener noreferrer">
                        Open
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {job.status === "failed" && job.error && (
        <div className="settings-error" style={{ marginTop: 12 }}>{job.error}</div>
      )}
    </section>
  );
}

export function RenderJobsPage() {
  const [jobs, setJobs] = useState<ZhihugenJobDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ZhihugenJobDto | null>(null);

  async function load() {
    setLoading(true);
    try {
      setJobs(await zhihugenClient.listJobs());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleUpdated(updated: ZhihugenJobDto) {
    setJobs((prev) => prev.map((j) => j.jobId === updated.jobId ? updated : j));
  }

  if (selected) {
    return (
      <JobDetail
        job={selected}
        onBack={() => setSelected(null)}
        onUpdated={handleUpdated}
      />
    );
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h1 className="page-title">Jobs</h1>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="jobs-grid">
        {jobs.length === 0 && !loading && <div className="jobs-empty">No jobs yet.</div>}
        {jobs.map((job) => (
          <div
            className="job-card"
            key={job.jobId}
            onClick={() => setSelected(job)}
            style={{ cursor: "pointer" }}
          >
            <div className="job-card-main">
              <span className="job-id">{job.jobId}</span>
              {job.label && <span className="job-title">{job.label}</span>}
            </div>
            <StatusBadge status={job.status} />
            <span className="job-output">
              {job.absolutePath
                ? <span className="job-path" title={job.absolutePath}>{job.absolutePath.split("/").pop()}</span>
                : "—"}
            </span>
            <span className="job-output">
              {job.telegram?.some((item) => item.status === "sent") ? "Telegram" : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

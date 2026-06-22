import { RefreshCw, ArrowLeft, Upload, X, Copy, Loader, Send, Image, Mic2, Download, Film, Send as SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { zhihugenClient, type ZhihugenJobDto, type JobEvent } from "../api/clients.js";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed" ? "badge badge-completed" :
    status === "failed" ? "badge badge-failed" :
    status === "awaiting_upload" ? "badge" :
    "badge badge-pending";
  const style = status === "awaiting_upload" ? { background: "var(--accent)", color: "#fff" } : undefined;
  return <span className={cls} style={style}>{status.replace("_", " ")}</span>;
}

const ALL_STEPS = ["images_generation", "tts", "download_resources", "rendering", "upload", "telegram"] as const;

const STEP_META: Record<string, { label: string; subtitle: string; icon: typeof Image }> = {
  images_generation: { label: "Images Generation", subtitle: "Thread Images", icon: Image },
  tts: { label: "TTS", subtitle: "Text-to-Speech", icon: Mic2 },
  download_resources: { label: "Download Resources", subtitle: "Background Video & Music", icon: Download },
  rendering: { label: "Rendering", subtitle: "FFmpeg Compositing", icon: Film },
  upload: { label: "Upload", subtitle: "7router Storage", icon: Upload },
  telegram: { label: "Telegram", subtitle: "Notification", icon: SendIcon },
};

type StepStatus = "pending" | "running" | "completed" | "failed";
type StepState = { status: StepStatus; time?: string; startedAt?: string; completedAt?: string; metadata?: Record<string, unknown> };

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running…",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_STYLE: Record<StepStatus, { border: string; bg: string; text: string; dot: string; icon: string }> = {
  pending:   { border: "var(--border)",           bg: "var(--surface-2)", text: "var(--text-muted)",   dot: "var(--text-muted)",   icon: "var(--text-muted)" },
  running:   { border: "rgba(0,196,204,0.4)",     bg: "rgba(0,196,204,0.05)", text: "var(--accent)",  dot: "var(--accent)",       icon: "var(--accent)" },
  completed: { border: "rgba(34,197,94,0.4)",     bg: "rgba(34,197,94,0.05)", text: "var(--success)", dot: "var(--success)",      icon: "var(--success)" },
  failed:    { border: "rgba(239,68,68,0.4)",     bg: "rgba(239,68,68,0.05)", text: "var(--error)",   dot: "var(--error)",        icon: "var(--error)" },
};

function deriveStepMap(events: JobEvent[]): Record<string, StepState> {
  const raw = new Map<string, { started?: string; completed?: string; failed?: string; metadata?: Record<string, unknown> }>();
  for (const e of events) {
    const entry = raw.get(e.step) ?? {};
    if (e.status === "started") entry.started = e.createdAt;
    else if (e.status === "completed") { entry.completed = e.createdAt; if (e.metadata) entry.metadata = e.metadata; }
    else if (e.status === "failed") entry.failed = e.createdAt;
    raw.set(e.step, entry);
  }

  const result: Record<string, StepState> = {};
  for (const key of ALL_STEPS) {
    const entry = raw.get(key);
    if (!entry) { result[key] = { status: "pending" }; continue; }
    if (entry.failed) result[key] = { status: "failed", time: entry.failed, startedAt: entry.started, completedAt: entry.failed };
    else if (entry.completed) result[key] = { status: "completed", time: entry.completed, startedAt: entry.started, completedAt: entry.completed, metadata: entry.metadata };
    else if (entry.started) result[key] = { status: "running", time: entry.started, startedAt: entry.started };
    else result[key] = { status: "pending" };
  }
  return result;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" })
    + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return "";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return "";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m ${rem.toFixed(0)}s`;
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  images_generation: "Renders each text block into a thread-style image using canvas.",
  tts: "Generates speech audio for each scene via Meddler TTS service in parallel.",
  download_resources: "Downloads the background video (and music) from storage to a local temp file.",
  rendering: "Composites images, TTS audio, and background video into the final .mp4 using FFmpeg.",
  upload: "Uploads the rendered video to 7router storage.",
  telegram: "Sends the video to configured Telegram destinations.",
};

function PNode({ stepKey, state, nodeRef, expanded, onToggle, children }: {
  stepKey: string;
  state: StepState;
  nodeRef?: (el: HTMLDivElement | null) => void;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const meta = STEP_META[stepKey];
  const Icon = meta.icon;
  const sty = STATUS_STYLE[state.status];
  const duration = formatDuration(state.startedAt, state.completedAt);
  return (
    <div
      ref={nodeRef}
      className={`pn${expanded ? " pn-expanded" : ""}`}
      style={{ borderColor: sty.border, background: sty.bg, cursor: "pointer" }}
      onClick={onToggle}
    >
      <div className="pn-header">
        <div className="pn-avatar" style={{ background: `${sty.icon}20`, color: sty.icon }}>
          <Icon size={16} />
        </div>
        <div className="pn-info">
          <div className="pn-title">{meta.label}</div>
          <div className="pn-subtitle">{meta.subtitle}</div>
        </div>
      </div>
      <div className="pn-status-row">
        <span className={`pn-dot${state.status === "running" ? " pn-dot-pulse" : ""}`} style={{ background: sty.dot }} />
        <span className="pn-status-label" style={{ color: sty.text }}>{STATUS_LABEL[state.status]}</span>
        {duration && <span className="pn-duration">{duration}</span>}
      </div>

      {expanded && (
        <div className="pn-detail">
          <div className="pn-detail-desc">{STEP_DESCRIPTIONS[stepKey]}</div>
          <div className="pn-detail-rows">
            {state.startedAt && (
              <div className="pn-detail-row">
                <span className="pn-detail-label">Started</span>
                <span className="pn-detail-value">{formatTimestamp(state.startedAt)}</span>
              </div>
            )}
            {state.completedAt && (
              <div className="pn-detail-row">
                <span className="pn-detail-label">{state.status === "failed" ? "Failed" : "Completed"}</span>
                <span className="pn-detail-value">{formatTimestamp(state.completedAt)}</span>
              </div>
            )}
            {duration && (
              <div className="pn-detail-row">
                <span className="pn-detail-label">Duration</span>
                <span className="pn-detail-value">{duration}</span>
              </div>
            )}
            {state.metadata?.cacheHit != null && (
              <div className="pn-detail-row">
                <span className="pn-detail-label">Cache</span>
                <span className="pn-detail-value" style={{ color: state.metadata.cacheHit ? "var(--success)" : "var(--text-muted)" }}>
                  {state.metadata.cacheHit ? "Hit" : "Miss"}
                </span>
              </div>
            )}
          </div>
          {children}
        </div>
      )}
    </div>
  );
}

type ConnPath = { d: string; color: string; dashed: boolean };

function PipelineProgress({ jobId, jobStatus, absolutePath, telegram }: { jobId: string; jobStatus: string; absolutePath?: string; telegram?: ZhihugenJobDto["telegram"] }) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [paths, setPaths] = useState<ConnPath[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });
  const [expanded, setExpanded] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const data = await zhihugenClient.getJobEvents(jobId);
        if (active) setEvents(data);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    }
    void poll();
    const isActive = jobStatus === "pending" || jobStatus === "rendering";
    const interval = isActive ? setInterval(poll, 3000) : undefined;
    return () => { active = false; if (interval) clearInterval(interval); };
  }, [jobId, jobStatus]);

  const s = deriveStepMap(events);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const cRect = container!.getBoundingClientRect();
      const get = (key: string) => {
        const el = nodeRefs.current[key];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          cx: r.left + r.width / 2 - cRect.left,
          top: r.top - cRect.top,
          bottom: r.bottom - cRect.top,
          left: r.left - cRect.left,
          right: r.right - cRect.left,
        };
      };

      const imgs = get("images_generation");
      const tts = get("tts");
      const dl = get("download_resources");
      const rend = get("rendering");
      const upl = get("upload");
      const tg = get("telegram");

      if (!imgs || !tts || !dl || !rend || !upl || !tg) return;

      const newPaths: ConnPath[] = [];
      const imgDone = s.images_generation.status === "completed";
      const ttsDone = s.tts.status === "completed";
      const dlDone = s.download_resources.status === "completed";

      const lineClr = (done: boolean) => done ? "#22c55e" : "#333333";
      const bezier = (x1: number, y1: number, x2: number, y2: number) => {
        const midY = (y1 + y2) / 2;
        return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      };
      const straight = (x1: number, y1: number, x2: number, y2: number) =>
        `M ${x1} ${y1} L ${x2} ${y2}`;

      // Images → TTS (fork left)
      newPaths.push({ d: bezier(imgs.cx, imgs.bottom, tts.cx, tts.top), color: lineClr(imgDone), dashed: !imgDone });
      // Images → Download (fork right)
      newPaths.push({ d: bezier(imgs.cx, imgs.bottom, dl.cx, dl.top), color: lineClr(imgDone), dashed: !imgDone });
      // TTS → Rendering (merge left)
      newPaths.push({ d: bezier(tts.cx, tts.bottom, rend.cx, rend.top), color: lineClr(ttsDone), dashed: !ttsDone });
      // Download → Rendering (merge right)
      newPaths.push({ d: bezier(dl.cx, dl.bottom, rend.cx, rend.top), color: lineClr(dlDone), dashed: !dlDone });
      // Rendering → Upload
      newPaths.push({ d: straight(rend.cx, rend.bottom, upl.cx, upl.top), color: lineClr(s.rendering.status === "completed"), dashed: s.rendering.status !== "completed" });
      // Upload → Telegram
      newPaths.push({ d: straight(upl.cx, upl.bottom, tg.cx, tg.top), color: lineClr(s.upload.status === "completed"), dashed: s.upload.status !== "completed" });

      const maxBottom = Math.max(imgs.bottom, tts.bottom, dl.bottom, rend.bottom, upl.bottom, tg.bottom);
      setSvgSize({ w: cRect.width, h: maxBottom });
      setPaths(newPaths);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [events, s, expanded]);

  if (loading) return null;

  const setRef = (key: string) => (el: HTMLDivElement | null) => { nodeRefs.current[key] = el; };
  const toggle = (key: string) => () => setExpanded((prev) => prev === key ? null : key);

  return (
    <div ref={containerRef} className="pg">
      <svg className="pg-svg" width={svgSize.w || "100%"} height={svgSize.h || "100%"}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.color} strokeWidth="2" fill="none" strokeDasharray={p.dashed ? "6 4" : undefined} opacity={0.5} />
        ))}
      </svg>

      <div className="pg-row pg-row-center">
        <PNode stepKey="images_generation" state={s.images_generation} nodeRef={setRef("images_generation")} expanded={expanded === "images_generation"} onToggle={toggle("images_generation")} />
      </div>

      <div className="pg-row pg-row-parallel">
        <PNode stepKey="tts" state={s.tts} nodeRef={setRef("tts")} expanded={expanded === "tts"} onToggle={toggle("tts")} />
        <PNode stepKey="download_resources" state={s.download_resources} nodeRef={setRef("download_resources")} expanded={expanded === "download_resources"} onToggle={toggle("download_resources")} />
      </div>

      <div className="pg-row pg-row-center">
        <PNode stepKey="rendering" state={s.rendering} nodeRef={setRef("rendering")} expanded={expanded === "rendering"} onToggle={toggle("rendering")} />
      </div>
      <div className="pg-row pg-row-center">
        {(() => {
          const uploadPath = absolutePath ?? (s.upload.metadata?.absolutePath as string | undefined);
          return (
            <PNode stepKey="upload" state={s.upload} nodeRef={setRef("upload")} expanded={expanded === "upload"} onToggle={toggle("upload")}>
              {uploadPath && (
                <div className="pn-detail-path" onClick={(e) => { e.stopPropagation(); void navigator.clipboard.writeText(uploadPath); }}>
                  <span className="pn-detail-label">Path</span>
                  <span className="pn-detail-path-value" title={uploadPath}>{uploadPath}</span>
                  <Copy size={10} className="pn-detail-copy" />
                </div>
              )}
            </PNode>
          );
        })()}
      </div>
      <div className="pg-row pg-row-center">
        <PNode stepKey="telegram" state={s.telegram} nodeRef={setRef("telegram")} expanded={expanded === "telegram"} onToggle={toggle("telegram")}>
          {telegram && telegram.length > 0 && (
            <div className="pn-detail-tg-list">
              {telegram.map((t, i) => (
                <div key={i} className="pn-detail-tg-row">
                  <span className={`pn-dot${t.status === "sent" ? "" : ""}`} style={{ background: t.status === "sent" ? "var(--success)" : "var(--error)" }} />
                  <span className="pn-detail-tg-name">{t.destinationName ?? t.chatId ?? "Telegram"}</span>
                  {t.link && <a className="pn-detail-tg-link" href={t.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Open ↗</a>}
                  {t.status === "failed" && t.error && <span className="pn-detail-tg-err" title={t.error}>{t.error}</span>}
                </div>
              ))}
            </div>
          )}
        </PNode>
      </div>
    </div>
  );
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
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    if (job.status !== "pending") return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const updated = await zhihugenClient.getJob(job.jobId);
        if (active && updated.status !== job.status) {
          setJob(updated);
          onUpdated(updated);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [job.jobId, job.status, onUpdated]);

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

  async function resend() {
    setError("");
    setResending(true);
    try {
      const updated = await zhihugenClient.resendJob(job.jobId);
      setJob(updated);
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resend failed.");
    } finally {
      setResending(false);
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

      <div className="form-section-label">Pipeline</div>
      <PipelineProgress jobId={job.jobId} jobStatus={job.status} absolutePath={job.absolutePath} telegram={job.telegram} />

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
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={resend} disabled={resending}>
              {resending ? <><Loader size={13} className="spin" /> Resending...</> : <><Send size={13} /> Resend to Telegram</>}
            </button>
          </div>
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

import { Plus, Trash2, Loader, Copy, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { zhihugenClient } from "../api/clients.js";

interface Scene {
  file: File | null;
  script: string;
}

export function CreateZhihugenRenderPage() {
  const [scenes, setScenes] = useState<Scene[]>([{ file: null, script: "" }]);
  const [label, setLabel] = useState("");
  const [previewBeforeUpload, setPreviewBeforeUpload] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [absolutePath, setAbsolutePath] = useState("");
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");

  useEffect(() => {
    if (!previewJobId) {
      setPreviewSrc("");
      return;
    }

    let objectUrl = "";
    zhihugenClient.previewBlob(previewJobId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPreviewSrc(objectUrl);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Preview failed."));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewJobId]);

  function addScene() { setScenes((s) => [...s, { file: null, script: "" }]); }
  function removeScene(i: number) { setScenes((s) => s.filter((_, j) => j !== i)); }
  function setFile(i: number, file: File | null) {
    setScenes((s) => s.map((sc, j) => j === i ? { ...sc, file } : sc));
  }
  function setScript(i: number, script: string) {
    setScenes((s) => s.map((sc, j) => j === i ? { ...sc, script } : sc));
  }

  async function submit() {
    setError("");
    setAbsolutePath("");
    setPreviewJobId(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      if (label) form.append("label", label);
      if (previewBeforeUpload) form.append("previewBeforeUpload", "true");
      for (const sc of scenes) {
        if (sc.file) form.append("images", sc.file);
        form.append("scripts", sc.script);
      }
      const result = await zhihugenClient.render(form);
      if ("status" in result && result.status === "awaiting_upload") {
        setPreviewJobId(result.jobId);
      } else if ("absolutePath" in result) {
        setAbsolutePath(result.absolutePath);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmUpload() {
    if (!previewJobId) return;
    setError("");
    setUploading(true);
    try {
      const { absolutePath: path } = await zhihugenClient.confirmUpload(previewJobId);
      setPreviewJobId(null);
      setAbsolutePath(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function discard() {
    if (!previewJobId) return;
    setError("");
    try {
      await zhihugenClient.discardJob(previewJobId);
      setPreviewJobId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discard failed.");
    }
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h1 className="page-title">Zhihugen</h1>
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="form-section-label">Scenes</div>
      {scenes.map((sc, i) => (
        <div key={i} className="image-entry">
          <div className="image-entry-header">
            <span className="image-entry-index">Scene {i + 1}</span>
            {scenes.length > 1 && (
              <button className="btn btn-danger-ghost btn-icon" onClick={() => removeScene(i)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(i, e.target.files?.[0] ?? null)}
              style={{ color: "var(--text-secondary)", fontSize: 13 }}
            />
            {sc.file && <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 4 }}>{sc.file.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Script</label>
            <textarea
              className="short"
              value={sc.script}
              placeholder="Narration for this scene…"
              onChange={(e) => setScript(i, e.target.value)}
            />
          </div>
        </div>
      ))}

      <button className="btn btn-ghost" style={{ marginBottom: 24 }} onClick={addScene}>
        <Plus size={13} /> Add scene
      </button>

      <div className="form-section-label">Options</div>
      <div className="form-group">
        <label className="form-label">Label <span style={{ color: "var(--danger, #e55)" }}>*</span></label>
        <input type="text" value={label} placeholder="My video" onChange={(e) => setLabel(e.target.value)} />
      </div>
      <div className="form-group">
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={previewBeforeUpload}
            onChange={(e) => setPreviewBeforeUpload(e.target.checked)}
          />
          Preview before uploading to storage
        </label>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={submit} disabled={submitting || !label.trim()}>
          {submitting ? <><Loader size={13} className="spin" /> Rendering…</> : <><Plus size={13} /> Render</>}
        </button>
      </div>

      {previewJobId && (
        <div className="job-result">
          <div className="job-result-row">
            <span className="badge" style={{ background: "var(--accent)", color: "#fff" }}>preview ready</span>
          </div>
          {previewSrc && (
            <video
              src={previewSrc}
              controls
              style={{ width: "100%", maxHeight: 400, marginTop: 12, borderRadius: 6, background: "#000" }}
            />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={confirmUpload} disabled={uploading}>
              {uploading ? <><Loader size={13} className="spin" /> Uploading…</> : <><Upload size={13} /> Upload to storage</>}
            </button>
            <button className="btn btn-danger-ghost" onClick={discard} disabled={uploading}>
              <X size={13} /> Discard
            </button>
          </div>
        </div>
      )}

      {absolutePath && (
        <div className="job-result">
          <div className="job-result-row">
            <span className="badge badge-completed">completed</span>
          </div>
          <div className="job-result-detail">
            <div className="job-result-path">{absolutePath}</div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 6, alignSelf: "flex-start" }}
              onClick={() => navigator.clipboard.writeText(absolutePath)}
            >
              <Copy size={12} /> Copy path
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

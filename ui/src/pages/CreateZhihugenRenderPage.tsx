import { Plus, Trash2, Loader, Copy, Upload, X, Settings, GripVertical, Send } from "lucide-react";
import { useEffect, useState } from "react";
import {
  settingsClient,
  sixgateClient,
  zhihugenClient,
  type SixGateGroup,
  type TelegramDestination,
  type TextBlock,
  type ZhihugenRenderRequest,
  type ZhihugenSettings,
} from "../api/clients.js";

/* ── Avatar helper ── */

function diceBearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

/* ── Card preview ── */

function CardPreview({ block }: { block: TextBlock }) {
  const author = block.author?.trim() || "User";
  return (
    <div className="zhg-card">
      <div className="zhg-card-header">
        <img className="zhg-card-avatar" src={diceBearUrl(author)} alt="" />
        <span className="zhg-card-author">{author}</span>
      </div>
      <p className="zhg-card-body">{block.text}</p>
    </div>
  );
}

/* ── Block editor row ── */

function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onRemove,
}: {
  block: TextBlock;
  index: number;
  total: number;
  onUpdate: (patch: Partial<TextBlock>) => void;
  onRemove: () => void;
}) {
  const author = block.author?.trim() || "User";
  return (
    <div className="zhg-block">
      <div className="zhg-block-grip">
        <GripVertical size={12} />
      </div>
      <img className="zhg-block-avatar" src={diceBearUrl(author)} alt="" />
      <div className="zhg-block-content">
        <input
          className="zhg-block-author-input"
          type="text"
          value={block.author ?? ""}
          placeholder="Author"
          onChange={(e) => onUpdate({ author: e.target.value || undefined })}
        />
        <textarea
          className="zhg-block-text"
          value={block.text}
          placeholder="Write something..."
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={2}
        />
      </div>
      {total > 1 && (
        <button className="zhg-block-remove" onClick={onRemove} title="Remove block">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Settings Dialog ── */

function ZhihugenSettingsDialog({
  open,
  settings,
  telegramDests,
  sixgateGroups,
  onSave,
  onClose,
}: {
  open: boolean;
  settings: ZhihugenSettings | null;
  telegramDests: { botId: string; botName: string; dest: TelegramDestination }[];
  sixgateGroups: SixGateGroup[];
  onSave: (s: Partial<ZhihugenSettings>) => Promise<void>;
  onClose: () => void;
}) {
  const [bgVideo, setBgVideo] = useState("");
  const [bgMusic, setBgMusic] = useState("");
  const [selDestIds, setSelDestIds] = useState<Set<string>>(new Set());
  const [selGroupId, setSelGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setBgVideo(settings.defaultBackgroundVideoPath);
    setBgMusic(settings.defaultBackgroundMusicPath ?? "");
    setSelDestIds(new Set(settings.defaultTelegramDestinationIds ?? []));
    setSelGroupId(settings.defaultSixgateGroupId ?? "");
  }, [settings]);

  if (!open) return null;

  function toggleDest(id: string) {
    setSelDestIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        defaultBackgroundVideoPath: bgVideo.trim(),
        defaultBackgroundMusicPath: bgMusic.trim(),
        defaultTelegramDestinationIds: [...selDestIds],
        defaultSixgateGroupId: selGroupId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>Zhihugen Settings</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Background Video Path</label>
            <input type="text" value={bgVideo} onChange={(e) => setBgVideo(e.target.value)} placeholder="CloudflareR2/..." className="font-mono" />
          </div>
          <div className="form-group">
            <label className="form-label">Background Music Path</label>
            <input type="text" value={bgMusic} onChange={(e) => setBgMusic(e.target.value)} placeholder="CloudflareR2/... (optional)" className="font-mono" />
          </div>
          {telegramDests.length > 0 && (
            <div className="form-group">
              <label className="form-label">Default Telegram Groups</label>
              <div className="destination-picker-compact">
                {telegramDests.map(({ dest }) => (
                  <label key={dest.id} className="dest-chip">
                    <input type="checkbox" checked={selDestIds.has(dest.id)} onChange={() => toggleDest(dest.id)} />
                    <span>{dest.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {sixgateGroups.length > 0 && (
            <div className="form-group">
              <label className="form-label">Default 6Gate Group</label>
              <select value={selGroupId} onChange={(e) => setSelGroupId(e.target.value)}>
                <option value="">— None —</option>
                {sixgateGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export function CreateZhihugenRenderPage() {
  const [blocks, setBlocks] = useState<TextBlock[]>([{ text: "" }]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [previewBeforeUpload, setPreviewBeforeUpload] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [absolutePath, setAbsolutePath] = useState("");
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");

  const [telegramDests, setTelegramDests] = useState<{ botId: string; botName: string; dest: TelegramDestination }[]>([]);
  const [selectedDestIds, setSelectedDestIds] = useState<Set<string>>(new Set());
  const [sixgateGroups, setSixgateGroups] = useState<SixGateGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [zhgSettings, setZhgSettings] = useState<ZhihugenSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let destsLoaded: { botId: string; botName: string; dest: TelegramDestination }[] = [];

    const loadTelegram = settingsClient.getTelegram().then((s) => {
      const dests: typeof destsLoaded = [];
      for (const bot of s.bots.filter((b) => b.enabled)) {
        for (const d of bot.destinations.filter((d) => d.enabled)) {
          dests.push({ botId: bot.id, botName: bot.name, dest: d });
        }
      }
      destsLoaded = dests;
      setTelegramDests(dests);
    }).catch(() => {});

    const loadGroups = sixgateClient.listGroups().then((groups) => {
      setSixgateGroups(groups);
    }).catch(() => {});

    Promise.all([loadTelegram, loadGroups]).then(() => {
      settingsClient.getZhihugen().then((s) => {
        setZhgSettings(s);
        if (s.defaultTelegramDestinationIds?.length) {
          setSelectedDestIds(new Set(s.defaultTelegramDestinationIds));
        } else {
          setSelectedDestIds(new Set(destsLoaded.map((d) => d.dest.id)));
        }
        if (s.defaultSixgateGroupId) {
          setSelectedGroupId(s.defaultSixgateGroupId);
        }
      }).catch(() => {
        setSelectedDestIds(new Set(destsLoaded.map((d) => d.dest.id)));
      });
    });
  }, []);

  useEffect(() => {
    if (!previewJobId) { setPreviewSrc(""); return; }
    let objectUrl = "";
    zhihugenClient.previewBlob(previewJobId)
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setPreviewSrc(objectUrl); })
      .catch((e) => setError(e instanceof Error ? e.message : "Preview failed."));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [previewJobId]);

  function addBlock() { setBlocks((b) => [...b, { text: "" }]); }
  function removeBlock(i: number) { setBlocks((b) => b.filter((_, j) => j !== i)); }
  function updateBlock(i: number, patch: Partial<TextBlock>) {
    setBlocks((b) => b.map((bl, j) => j === i ? { ...bl, ...patch } : bl));
  }
  function toggleDest(id: string) {
    setSelectedDestIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function handleSaveSettings(patch: Partial<ZhihugenSettings>) {
    const updated = await settingsClient.updateZhihugen(patch);
    setZhgSettings(updated);
  }

  async function submit() {
    setError(""); setAbsolutePath(""); setPreviewJobId(null); setSubmitting(true);
    try {
      const body: ZhihugenRenderRequest = {
        blocks: blocks.filter((b) => b.text.trim()),
        title: title.trim(),
        caption: caption.trim() || undefined,
        destinationIds: [...selectedDestIds],
        sixgateGroupId: selectedGroupId || undefined,
        previewBeforeUpload,
      };
      const result = await zhihugenClient.render(body);
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
    setError(""); setUploading(true);
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
    try { await zhihugenClient.discardJob(previewJobId); setPreviewJobId(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Discard failed."); }
  }

  const hasBlocks = blocks.some((b) => b.text.trim());
  const visibleBlocks = blocks.filter((b) => b.text.trim());

  return (
    <section className="panel zhg-page">
      {/* ── Left: Editor ── */}
      <div className="zhg-editor">
        <div className="zhg-editor-top">
          <h1 className="zhg-title">Zhihugen</h1>
          <button className="zhg-settings-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Settings size={14} />
          </button>
        </div>

        {error && <div className="zhg-error">{error}</div>}

        {/* Title & Caption */}
        <div className="zhg-meta">
          <input
            className="zhg-meta-title"
            type="text"
            value={title}
            placeholder="Video title *"
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="zhg-meta-caption"
            type="text"
            value={caption}
            placeholder="Caption (optional)"
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        {/* Blocks */}
        <div className="zhg-blocks">
          {blocks.map((bl, i) => (
            <BlockEditor
              key={i}
              block={bl}
              index={i}
              total={blocks.length}
              onUpdate={(patch) => updateBlock(i, patch)}
              onRemove={() => removeBlock(i)}
            />
          ))}
          <button className="zhg-add-block" onClick={addBlock}>
            <Plus size={14} /> Add block
          </button>
        </div>

        {/* Delivery options */}
        {(telegramDests.length > 0 || sixgateGroups.length > 0) && (
          <div className="zhg-delivery">
            <span className="zhg-delivery-label">Deliver to</span>
            <div className="zhg-delivery-options">
              {telegramDests.map(({ dest }) => (
                <label key={dest.id} className="zhg-chip">
                  <input type="checkbox" checked={selectedDestIds.has(dest.id)} onChange={() => toggleDest(dest.id)} />
                  <span>{dest.name}</span>
                </label>
              ))}
              {sixgateGroups.length > 0 && (
                <select className="zhg-delivery-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                  <option value="">6Gate: None</option>
                  {sixgateGroups.map((g) => (
                    <option key={g.id} value={g.id}>6Gate: {g.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="zhg-actions">
          <label className="zhg-check">
            <input type="checkbox" checked={previewBeforeUpload} onChange={(e) => setPreviewBeforeUpload(e.target.checked)} />
            Preview before upload
          </label>
          <button className="zhg-render-btn" onClick={submit} disabled={submitting || !title.trim() || !hasBlocks}>
            {submitting ? <><Loader size={14} className="spin" /> Rendering...</> : <><Send size={14} /> Render</>}
          </button>
        </div>

        {/* Video preview result */}
        {previewJobId && (
          <div className="zhg-result">
            <span className="zhg-result-badge zhg-result-badge--preview">preview ready</span>
            {previewSrc && (
              <video src={previewSrc} controls className="zhg-result-video" />
            )}
            <div className="zhg-result-actions">
              <button className="btn btn-primary btn-sm" onClick={confirmUpload} disabled={uploading}>
                {uploading ? <><Loader size={13} className="spin" /> Uploading...</> : <><Upload size={13} /> Upload</>}
              </button>
              <button className="btn btn-danger-ghost btn-sm" onClick={discard} disabled={uploading}>
                <X size={13} /> Discard
              </button>
            </div>
          </div>
        )}

        {/* Completed */}
        {absolutePath && (
          <div className="zhg-result">
            <span className="zhg-result-badge zhg-result-badge--done">completed</span>
            <div className="zhg-result-path">{absolutePath}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(absolutePath)}>
              <Copy size={12} /> Copy path
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Live Preview ── */}
      <div className="zhg-preview">
        <div className="zhg-preview-header">Preview</div>
        <div className="zhg-preview-phone">
          <div className="zhg-preview-scroll">
            {visibleBlocks.length === 0 ? (
              <div className="zhg-preview-empty">Cards will appear here as you type</div>
            ) : (
              visibleBlocks.map((b, i) => <CardPreview key={i} block={b} />)
            )}
          </div>
        </div>
      </div>

      <ZhihugenSettingsDialog
        open={showSettings}
        settings={zhgSettings}
        telegramDests={telegramDests}
        sixgateGroups={sixgateGroups}
        onSave={handleSaveSettings}
        onClose={() => setShowSettings(false)}
      />
    </section>
  );
}

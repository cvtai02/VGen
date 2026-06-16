import { Loader, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, type TtsSettings, type ZhihugenSettings } from "../api/clients.js";

const defaultZhihugen: ZhihugenSettings = {
  defaultOutputDirectory: "",
  defaultBackgroundVideoPath: "",
  defaultFps: 30,
  defaultImageFit: "contain",
  defaultResolution: "1080x1920",
  defaultTtsModel: "",
};

export function SettingsPage() {
  const [tts, setTts] = useState<TtsSettings>({ baseUrl: "", apiKey: "" });
  const [zhihugen, setZhihugen] = useState<ZhihugenSettings>(defaultZhihugen);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [ttsKeyDirty, setTtsKeyDirty] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsClient.getTts(),
      settingsClient.getZhihugen(),
    ])
      .then(([t, z]) => {
        setTts({ baseUrl: t.baseUrl, apiKey: "" });
        setZhihugen(z);
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const ttsPayload: Partial<TtsSettings> = { baseUrl: tts.baseUrl };
      if (ttsKeyDirty) ttsPayload.apiKey = tts.apiKey;

      const [t, z] = await Promise.all([
        settingsClient.updateTts(ttsPayload),
        settingsClient.updateZhihugen(zhihugen),
      ]);
      setTts({ baseUrl: t.baseUrl, apiKey: "" });
      setZhihugen(z);
      setTtsKeyDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {loading && <div className="settings-loading"><Loader size={14} className="spin" /> Loading...</div>}
      {error && <div className="settings-error">{error}</div>}

      {!loading && (
        <>
          <div className="settings-section-title">TTS (9router)</div>

          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              type="text"
              value={tts.baseUrl}
              placeholder="http://localhost:9000"
              onChange={(e) => setTts((t) => ({ ...t, baseUrl: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">API key</label>
            <input
              type="password"
              value={tts.apiKey}
              placeholder="********  (leave blank to keep current)"
              onChange={(e) => { setTtsKeyDirty(true); setTts((t) => ({ ...t, apiKey: e.target.value })); }}
            />
          </div>

          <div className="settings-section-title" style={{ marginTop: "1.5rem" }}>Zhihugen</div>

          <div className="form-group">
            <label className="form-label">Default output directory</label>
            <input
              type="text"
              value={zhihugen.defaultOutputDirectory}
              placeholder="CloudflareR2/bucket/path"
              onChange={(e) => setZhihugen((z) => ({ ...z, defaultOutputDirectory: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default background video path</label>
            <input
              type="text"
              value={zhihugen.defaultBackgroundVideoPath}
              placeholder="CloudflareR2/bucket/video.mp4"
              onChange={(e) => setZhihugen((z) => ({ ...z, defaultBackgroundVideoPath: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default TTS model</label>
            <input
              type="text"
              value={zhihugen.defaultTtsModel}
              placeholder="edge-tts/vi-VN-HoaiMyNeural"
              onChange={(e) => setZhihugen((z) => ({ ...z, defaultTtsModel: e.target.value }))}
            />
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <><Loader size={13} className="spin" /> Saving...</> : <><Save size={13} /> Save</>}
            </button>
            {saved && <span className="status-msg">Saved.</span>}
          </div>
        </>
      )}
    </section>
  );
}

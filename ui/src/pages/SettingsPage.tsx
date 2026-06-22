import { Loader, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, type ZhihugenSettings } from "../api/clients.js";

const defaultZhihugen: ZhihugenSettings = {
  defaultOutputDirectory: "",
  defaultBackgroundVideoPath: "",
  defaultBackgroundMusicPath: "",
  defaultFps: 30,
  defaultImageFit: "contain",
  defaultResolution: "1080x1920",
  defaultTtsModel: "",
  defaultTelegramDestinationIds: [],
};

export function SettingsPage() {
  const [zhihugen, setZhihugen] = useState<ZhihugenSettings>(defaultZhihugen);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    settingsClient.getZhihugen()
      .then((z) => setZhihugen(z))
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updated = await settingsClient.updateZhihugen(zhihugen);
      setZhihugen(updated);
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
          <div className="settings-section-title">Zhihugen</div>

          <div className="form-group">
            <label className="form-label">Default output directory</label>
            <input
              type="text"
              value={zhihugen.defaultOutputDirectory}
              placeholder="CloudflareR2/my-account/my-bucket/videos"
              onChange={(e) => setZhihugen((z) => ({ ...z, defaultOutputDirectory: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Default background video path</label>
            <input
              type="text"
              value={zhihugen.defaultBackgroundVideoPath}
              placeholder="./media/background.mp4 or https://..."
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

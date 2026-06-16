import { Loader, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, type TelegramSettings, type TtsSettings, type ZhihugenSettings } from "../api/clients.js";

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
  const [telegram, setTelegram] = useState<TelegramSettings>({
    enabled: false,
    botToken: "",
    chatId: "",
    captionTemplate: "{label}\n\n{cdnUrl}"
  });
  const [zhihugen, setZhihugen] = useState<ZhihugenSettings>(defaultZhihugen);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [ttsKeyDirty, setTtsKeyDirty] = useState(false);
  const [telegramTokenDirty, setTelegramTokenDirty] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsClient.getTts(),
      settingsClient.getTelegram(),
      settingsClient.getZhihugen(),
    ])
      .then(([t, tg, z]) => {
        setTts({ baseUrl: t.baseUrl, apiKey: "" });
        setTelegram({ ...tg, botToken: "" });
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
      const telegramPayload: Partial<TelegramSettings> = {
        enabled: telegram.enabled,
        chatId: telegram.chatId,
        captionTemplate: telegram.captionTemplate
      };
      if (telegramTokenDirty) telegramPayload.botToken = telegram.botToken;

      const [t, tg, z] = await Promise.all([
        settingsClient.updateTts(ttsPayload),
        settingsClient.updateTelegram(telegramPayload),
        settingsClient.updateZhihugen(zhihugen),
      ]);
      setTts({ baseUrl: t.baseUrl, apiKey: "" });
      setTelegram({ ...tg, botToken: "" });
      setZhihugen(z);
      setTtsKeyDirty(false);
      setTelegramTokenDirty(false);
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

          <div className="settings-section-title" style={{ marginTop: "1.5rem" }}>Telegram Delivery</div>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={telegram.enabled}
              onChange={(e) => setTelegram((t) => ({ ...t, enabled: e.target.checked }))}
            />
            <span>Upload completed Zhihugen videos to Telegram</span>
          </label>

          <div className="form-group">
            <label className="form-label">Bot token</label>
            <input
              type="password"
              value={telegram.botToken}
              placeholder={telegram.hasBotToken ? "********  (leave blank to keep current)" : "123456:ABC..."}
              onChange={(e) => { setTelegramTokenDirty(true); setTelegram((t) => ({ ...t, botToken: e.target.value })); }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Group chat ID</label>
            <input
              type="text"
              value={telegram.chatId}
              placeholder="-1001234567890 or @public_group"
              onChange={(e) => setTelegram((t) => ({ ...t, chatId: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Caption template</label>
            <textarea
              className="short"
              value={telegram.captionTemplate}
              placeholder="{label}\n\n{cdnUrl}"
              onChange={(e) => setTelegram((t) => ({ ...t, captionTemplate: e.target.value }))}
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

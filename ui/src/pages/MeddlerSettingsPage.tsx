import { Loader, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, type TtsSettings } from "../api/clients.js";

const defaultSettings: TtsSettings = {
  baseUrl: "https://meddler.minfect.com",
  apiKey: "",
  provider: "elevenlabs",
  voiceModel: ""
};

export function MeddlerSettingsPage() {
  const [settings, setSettings] = useState<TtsSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tokenDirty, setTokenDirty] = useState(false);

  useEffect(() => {
    settingsClient.getTts()
      .then((data) => {
        setSettings({
          baseUrl: data.baseUrl || defaultSettings.baseUrl,
          apiKey: "",
          provider: data.provider || defaultSettings.provider,
          voiceModel: data.voiceModel || ""
        });
      })
      .catch(() => setError("Failed to load Meddler settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const payload: Partial<TtsSettings> = {
        baseUrl: settings.baseUrl.trim()
      };
      if (tokenDirty) payload.apiKey = settings.apiKey;

      const updated = await settingsClient.updateTts(payload);
      setSettings({
        baseUrl: updated.baseUrl,
        apiKey: "",
        provider: updated.provider,
        voiceModel: updated.voiceModel
      });
      setTokenDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h1 className="page-title">Meddler</h1>
      </div>

      {loading && <div className="settings-loading"><Loader size={14} className="spin" /> Loading...</div>}
      {error && <div className="settings-error">{error}</div>}

      {!loading && (
        <>
          <div className="settings-section-title">Text-to-Speech</div>

          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              type="url"
              value={settings.baseUrl}
              placeholder="https://meddler.minfect.com"
              onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access token</label>
            <input
              type="password"
              value={settings.apiKey}
              placeholder="********  (leave blank to keep current)"
              onChange={(event) => {
                setTokenDirty(true);
                setSettings((current) => ({ ...current, apiKey: event.target.value }));
              }}
            />
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={save} disabled={saving || !settings.baseUrl.trim()}>
              {saving ? <><Loader size={13} className="spin" /> Saving...</> : <><Save size={13} /> Save</>}
            </button>
            {saved && <span className="status-msg">Saved.</span>}
          </div>
        </>
      )}
    </section>
  );
}

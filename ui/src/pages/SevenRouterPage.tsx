import { Loader, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, type StorageSettings } from "../api/clients.js";

const defaultStorage: StorageSettings = {
  baseUrl: "https://7router-api.minfect.com",
  accessToken: "",
  tempUploadExpiresInSeconds: 900
};

export function SevenRouterPage() {
  const [storage, setStorage] = useState<StorageSettings>(defaultStorage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tokenDirty, setTokenDirty] = useState(false);

  useEffect(() => {
    settingsClient.getStorage()
      .then((s) => setStorage({ ...s, accessToken: "" }))
      .catch(() => setError("Failed to load 7router settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const payload: Partial<StorageSettings> = {
        baseUrl: storage.baseUrl.trim(),
        tempUploadExpiresInSeconds: Number(storage.tempUploadExpiresInSeconds)
      };
      if (tokenDirty) payload.accessToken = storage.accessToken;

      const updated = await settingsClient.updateStorage(payload);
      setStorage({ ...updated, accessToken: "" });
      setTokenDirty(false);
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
        <h1 className="page-title">7router</h1>
      </div>

      {loading && <div className="settings-loading"><Loader size={14} className="spin" /> Loading...</div>}
      {error && <div className="settings-error">{error}</div>}

      {!loading && (
        <>
          <div className="settings-section-title">Upload Storage</div>

          <div className="form-group">
            <label className="form-label">Base URL</label>
            <input
              type="url"
              value={storage.baseUrl}
              placeholder="https://7router-api.minfect.com"
              onChange={(e) => setStorage((s) => ({ ...s, baseUrl: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access token</label>
            <input
              type="password"
              value={storage.accessToken}
              placeholder="********  (leave blank to keep current)"
              onChange={(e) => {
                setTokenDirty(true);
                setStorage((s) => ({ ...s, accessToken: e.target.value }));
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Upload URL lifetime (seconds)</label>
            <input
              type="number"
              min={1}
              value={storage.tempUploadExpiresInSeconds}
              onChange={(e) => setStorage((s) => ({ ...s, tempUploadExpiresInSeconds: Number(e.target.value) }))}
            />
          </div>

          <div className="actions">
            <button className="btn btn-primary" onClick={save} disabled={saving || !storage.baseUrl.trim()}>
              {saving ? <><Loader size={13} className="spin" /> Saving...</> : <><Save size={13} /> Save</>}
            </button>
            {saved && <span className="status-msg">Saved.</span>}
          </div>
        </>
      )}
    </section>
  );
}

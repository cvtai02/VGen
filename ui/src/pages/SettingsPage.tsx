import { Save, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient } from "../api/clients.js";

export function SettingsPage() {
  const [token, setToken] = useState(localStorage.getItem("vgen-admin-token") ?? "");
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const settings = await settingsClient.getSettings();
    setJson(JSON.stringify(settings, null, 2));
  }

  async function save() {
    localStorage.setItem("vgen-admin-token", token);
    const response = await settingsClient.updateSettings(JSON.parse(json), token);
    setJson(JSON.stringify(response.settings, null, 2));
    setMessage(response.restartRequired ? "Saved. Restart required." : "Saved.");
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <h1>Settings</h1>
      <label>Admin token<input value={token} onChange={(event) => setToken(event.target.value)} /></label>
      <textarea value={json} onChange={(event) => setJson(event.target.value)} spellCheck={false} />
      <div className="actions">
        <button onClick={load}><RefreshCw size={16} /> Refresh</button>
        <button onClick={save}><Save size={16} /> Save</button>
      </div>
      {message && <p className="status">{message}</p>}
    </section>
  );
}

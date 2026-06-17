import { Bot, Check, Loader, Plus, RefreshCw, Save, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, telegramClient, type TelegramBot, type TelegramSettings } from "../api/clients.js";
import "../styles/telegram.css";

const emptySettings: TelegramSettings = {
  enabled: false,
  captionTemplate: "{label}\n\n{cdnUrl}",
  bots: []
};

function replaceBot(settings: TelegramSettings, bot: TelegramBot): TelegramSettings {
  return { ...settings, bots: settings.bots.map((item) => item.id === bot.id ? bot : item) };
}

export function TelegramPage() {
  const [settings, setSettings] = useState<TelegramSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [botForm, setBotForm] = useState({ name: "", botToken: "", chatId: "", chatName: "" });
  const [addingBot, setAddingBot] = useState(false);
  const [destinationForms, setDestinationForms] = useState<Record<string, { chatId: string; name: string }>>({});

  async function load() {
    setError("");
    setLoading(true);
    try {
      setSettings(await settingsClient.getTelegram());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Telegram settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function saveGlobal() {
    setSaving(true);
    setSaved("");
    setError("");
    try {
      const updated = await settingsClient.updateTelegram({
        enabled: settings.enabled,
        captionTemplate: settings.captionTemplate
      });
      setSettings(updated);
      setSaved("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function addBot() {
    setAddingBot(true);
    setError("");
    setSaved("");
    try {
      const bot = await telegramClient.addBot({
        name: botForm.name || undefined,
        botToken: botForm.botToken,
        chatId: botForm.chatId || undefined,
        chatName: botForm.chatName || undefined
      });
      setSettings((current) => ({ ...current, bots: [...current.bots, bot] }));
      setBotForm({ name: "", botToken: "", chatId: "", chatName: "" });
      setSaved("Bot added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add bot.");
    } finally {
      setAddingBot(false);
    }
  }

  async function updateBot(botId: string, body: { name?: string; botToken?: string; enabled?: boolean }) {
    const bot = await telegramClient.updateBot(botId, body);
    setSettings((current) => replaceBot(current, bot));
  }

  async function deleteBot(botId: string) {
    await telegramClient.deleteBot(botId);
    setSettings((current) => ({ ...current, bots: current.bots.filter((bot) => bot.id !== botId) }));
  }

  async function syncBot(botId: string) {
    const result = await telegramClient.syncBot(botId);
    setSettings((current) => replaceBot(current, result.bot));
    setSaved(result.warning ?? `Synced ${result.discovered} chat${result.discovered === 1 ? "" : "s"}.`);
  }

  async function addDestination(botId: string) {
    const form = destinationForms[botId] ?? { chatId: "", name: "" };
    if (!form.chatId.trim()) return;
    const bot = await telegramClient.addDestination(botId, { chatId: form.chatId, name: form.name || undefined });
    setSettings((current) => replaceBot(current, bot));
    setDestinationForms((current) => ({ ...current, [botId]: { chatId: "", name: "" } }));
  }

  async function updateDestination(botId: string, destinationId: string, body: { name?: string; enabled?: boolean }) {
    const bot = await telegramClient.updateDestination(botId, destinationId, body);
    setSettings((current) => replaceBot(current, bot));
  }

  async function deleteDestination(botId: string, destinationId: string) {
    const bot = await telegramClient.deleteDestination(botId, destinationId);
    setSettings((current) => replaceBot(current, bot));
  }

  return (
    <section className="panel telegram-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Telegram</h1>
          <p className="page-subtitle">Upload completed generated videos to group chats.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <div className="settings-loading"><Loader size={14} className="spin" /> Loading...</div>}
      {error && <div className="settings-error">{error}</div>}
      {saved && <div className="status-msg">{saved}</div>}

      {!loading && (
        <div className="telegram-layout">
          <section className="telegram-card">
            <div className="telegram-card-header">
              <div>
                <h2>Delivery</h2>
                <p>{settings.bots.length} bot{settings.bots.length === 1 ? "" : "s"} configured</p>
              </div>
              <label className="telegram-switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
                />
                <span>{settings.enabled ? "Enabled" : "Disabled"}</span>
              </label>
            </div>
            <div className="telegram-card-body">
              <div className="form-group">
                <label className="form-label">Caption template</label>
                <textarea
                  className="short"
                  value={settings.captionTemplate}
                  placeholder="{label}\n\n{cdnUrl}"
                  onChange={(event) => setSettings((current) => ({ ...current, captionTemplate: event.target.value }))}
                />
              </div>
              <button className="btn btn-primary" onClick={saveGlobal} disabled={saving}>
                {saving ? <><Loader size={13} className="spin" /> Saving...</> : <><Save size={13} /> Save delivery</>}
              </button>
            </div>
          </section>

          <section className="telegram-card">
            <div className="telegram-card-header">
              <div>
                <h2>Add bot</h2>
                <p>Create a bot with BotFather, add it to a group, then paste the token here.</p>
              </div>
            </div>
            <div className="telegram-add-grid">
              <input type="text" value={botForm.name} placeholder="Bot name" onChange={(event) => setBotForm((form) => ({ ...form, name: event.target.value }))} />
              <input type="password" value={botForm.botToken} placeholder="Bot token" onChange={(event) => setBotForm((form) => ({ ...form, botToken: event.target.value }))} />
              <input type="text" value={botForm.chatId} placeholder="Optional group chat ID" onChange={(event) => setBotForm((form) => ({ ...form, chatId: event.target.value }))} />
              <input type="text" value={botForm.chatName} placeholder="Optional chat name" onChange={(event) => setBotForm((form) => ({ ...form, chatName: event.target.value }))} />
              <button className="btn btn-primary" onClick={addBot} disabled={addingBot || !botForm.botToken.trim()}>
                {addingBot ? <><Loader size={13} className="spin" /> Adding...</> : <><Plus size={13} /> Add bot</>}
              </button>
            </div>
          </section>

          <div className="telegram-bots">
            {settings.bots.length === 0 && (
              <div className="telegram-empty">
                <Bot size={22} />
                <span>No Telegram bots yet.</span>
              </div>
            )}
            {settings.bots.map((bot) => (
              <TelegramBotCard
                key={bot.id}
                bot={bot}
                destinationForm={destinationForms[bot.id] ?? { chatId: "", name: "" }}
                setDestinationForm={(form) => setDestinationForms((current) => ({ ...current, [bot.id]: form }))}
                onUpdateBot={updateBot}
                onDeleteBot={deleteBot}
                onSyncBot={syncBot}
                onAddDestination={addDestination}
                onUpdateDestination={updateDestination}
                onDeleteDestination={deleteDestination}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function TelegramBotCard({
  bot,
  destinationForm,
  setDestinationForm,
  onUpdateBot,
  onDeleteBot,
  onSyncBot,
  onAddDestination,
  onUpdateDestination,
  onDeleteDestination
}: {
  bot: TelegramBot;
  destinationForm: { chatId: string; name: string };
  setDestinationForm: (form: { chatId: string; name: string }) => void;
  onUpdateBot: (botId: string, body: { name?: string; botToken?: string; enabled?: boolean }) => Promise<void>;
  onDeleteBot: (botId: string) => Promise<void>;
  onSyncBot: (botId: string) => Promise<void>;
  onAddDestination: (botId: string) => Promise<void>;
  onUpdateDestination: (botId: string, destinationId: string, body: { name?: string; enabled?: boolean }) => Promise<void>;
  onDeleteDestination: (botId: string, destinationId: string) => Promise<void>;
}) {
  const [name, setName] = useState(bot.name);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setName(bot.name);
  }, [bot.name]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy("");
    }
  }

  return (
    <article className="telegram-card telegram-bot-card">
      <div className="telegram-card-header">
        <div className="telegram-bot-title">
          <div className="telegram-bot-icon"><Send size={16} /></div>
          <div>
            <h2>{bot.name}</h2>
            <p>{bot.username ? `@${bot.username}` : bot.id}</p>
          </div>
        </div>
        <label className="telegram-switch">
          <input
            type="checkbox"
            checked={bot.enabled}
            onChange={(event) => void run("bot", () => onUpdateBot(bot.id, { enabled: event.target.checked }))}
          />
          <span>{bot.enabled ? "Active" : "Off"}</span>
        </label>
      </div>

      <div className="telegram-bot-tools">
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
        <button className="btn btn-ghost" disabled={busy === "name" || !name.trim()} onClick={() => void run("name", () => onUpdateBot(bot.id, { name }))}>
          {busy === "name" ? <Loader size={13} className="spin" /> : <Check size={13} />} Rename
        </button>
        <input type="password" value={token} placeholder={bot.hasBotToken ? "New token (optional)" : "Bot token"} onChange={(event) => setToken(event.target.value)} />
        <button className="btn btn-ghost" disabled={busy === "token" || !token.trim()} onClick={() => void run("token", async () => { await onUpdateBot(bot.id, { botToken: token }); setToken(""); })}>
          {busy === "token" ? <Loader size={13} className="spin" /> : <Save size={13} />} Token
        </button>
        <button className="btn btn-ghost" disabled={busy === "sync"} onClick={() => void run("sync", () => onSyncBot(bot.id))}>
          {busy === "sync" ? <Loader size={13} className="spin" /> : <RefreshCw size={13} />} Sync
        </button>
        <button className="btn btn-danger-ghost" disabled={busy === "delete"} onClick={() => void run("delete", () => onDeleteBot(bot.id))}>
          <Trash2 size={13} /> Remove
        </button>
      </div>

      <div className="telegram-destinations">
        <div className="telegram-destination-add">
          <input
            type="text"
            value={destinationForm.chatId}
            placeholder="-1001234567890 or @public_group"
            onChange={(event) => setDestinationForm({ ...destinationForm, chatId: event.target.value })}
          />
          <input
            type="text"
            value={destinationForm.name}
            placeholder="Name"
            onChange={(event) => setDestinationForm({ ...destinationForm, name: event.target.value })}
          />
          <button className="btn btn-primary" disabled={!destinationForm.chatId.trim()} onClick={() => void run("destination", () => onAddDestination(bot.id))}>
            <Plus size={13} /> Add chat
          </button>
        </div>

        {bot.destinations.length === 0 ? (
          <div className="telegram-empty small">No destinations. Sync chats or add a group manually.</div>
        ) : (
          bot.destinations.map((destination) => (
            <div className="telegram-destination-row" key={destination.id}>
              <label className="telegram-switch compact">
                <input
                  type="checkbox"
                  checked={destination.enabled}
                  onChange={(event) => void run(destination.id, () => onUpdateDestination(bot.id, destination.id, { enabled: event.target.checked }))}
                />
                <span>{destination.enabled ? "On" : "Off"}</span>
              </label>
              <div className="telegram-destination-main">
                <span>{destination.name}</span>
                <code>{destination.chatId}</code>
              </div>
              <button className="router-icon-button" title="Remove destination" onClick={() => void run(destination.id, () => onDeleteDestination(bot.id, destination.id))}>
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

import { Loader, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsClient, telegramClient, type TelegramBot, type TelegramSettings } from "../api/clients.js";


function AddBotModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [botToken, setBotToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await telegramClient.addBot({ botToken });
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add bot");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Telegram Bot</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="settings-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Bot Token</label>
            <input
              required
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
            />
            <span className="form-hint">Get this from @BotFather on Telegram</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !botToken.trim()}>
              {submitting ? <><Loader size={13} className="spin" /> Adding...</> : "Add Bot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BotCard({ bot, onRefresh }: { bot: TelegramBot; onRefresh: () => void }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ kind: "success" | "warn"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await telegramClient.syncBot(bot.id);
      if (result.warning) {
        setSyncMsg({ kind: "warn", text: result.warning });
      } else {
        setSyncMsg({ kind: "success", text: `Found ${result.discovered} chat${result.discovered !== 1 ? "s" : ""} (${result.created} new, ${result.updated} updated)` });
      }
      onRefresh();
    } catch (err) {
      setSyncMsg({ kind: "warn", text: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Disconnect bot "${bot.name}"?`)) return;
    setDeleting(true);
    try {
      await telegramClient.deleteBot(bot.id);
      onRefresh();
    } catch {
      setDeleting(false);
    }
  }

  async function deleteDestination(destId: string) {
    await telegramClient.deleteDestination(bot.id, destId);
    onRefresh();
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="avatar">{bot.name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="card-title">{bot.name}</div>
            {bot.username && <div className="card-subtitle">@{bot.username}</div>}
          </div>
        </div>
        <div className="card-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={12} className={syncing ? "spin" : ""} />
            {syncing ? "Syncing..." : "Sync Chats"}
          </button>
          <button className="btn btn-danger-ghost btn-sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 size={12} /> Disconnect
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`card-message ${syncMsg.kind === "success" ? "card-message-success" : "card-message-warn"}`}>
          {syncMsg.text}
        </div>
      )}

      {bot.destinations.length > 0 && (
        <div className="destination-list">
          <div className="destination-list-header">Destinations</div>
          {bot.destinations.map((dest) => (
            <div key={dest.id} className="destination-row">
              <div className="destination-info">
                <span className="destination-name">{dest.name}</span>
                <span className="destination-meta">{dest.type} &middot; {dest.chatId}</span>
              </div>
              <button className="btn btn-ghost btn-icon btn-xs" onClick={() => deleteDestination(dest.id)} title="Remove">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {bot.destinations.length === 0 && (
        <div className="card-empty">
          No chats discovered yet. Click "Sync Chats" after adding this bot to a group.
        </div>
      )}
    </div>
  );
}

export function TelegramPage() {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBot, setShowAddBot] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const s = await settingsClient.getTelegram();
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <section className="panel">
        <div className="page-header"><h1 className="page-title">Telegram</h1></div>
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          <Loader size={16} className="spin" /> Loading...
        </div>
      </section>
    );
  }

  const bots = settings?.bots ?? [];

  return (
    <section className="panel">
      {showAddBot && <AddBotModal onClose={() => setShowAddBot(false)} onAdded={load} />}

      <div className="page-header">
        <h1 className="page-title">Telegram</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddBot(true)}>
            <Plus size={13} /> Add Bot
          </button>
        </div>
      </div>

      {error && <div className="settings-error">{error}</div>}

      <div className="info-box">
        <div className="info-box-title">How to use</div>
        <ol className="info-box-steps">
          <li>Create a bot with <strong>@BotFather</strong> on Telegram and copy the token.</li>
          <li>Add the bot to your group/channel, then click <strong>Sync Chats</strong>.</li>
          <li>In <strong>Zhihugen</strong>, select which chats to send to.</li>
        </ol>
      </div>

      {bots.length === 0 ? (
        <div className="empty-state">
          <p>No bots connected yet</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddBot(true)}>
            <Plus size={13} /> Add Bot
          </button>
        </div>
      ) : (
        <div className="card-list">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onRefresh={load} />
          ))}
        </div>
      )}
    </section>
  );
}

import { ArrowLeft, ExternalLink, Folder, File, Loader, RefreshCw, Save, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  settingsClient,
  storageClient,
  type StorageAccessDirectory,
  type StorageBrowseItem,
  type StorageSettings
} from "../api/clients.js";

function formatBytes(value?: number) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function SevenRouterSettingsDialog({
  settings,
  onClose,
  onSaved
}: {
  settings: StorageSettings;
  onClose: () => void;
  onSaved: (updated: StorageSettings) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload: Partial<StorageSettings> = { baseUrl: baseUrl.trim() };
      if (accessToken) payload.accessToken = accessToken;
      const updated = await settingsClient.updateStorage(payload);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="router-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <section className="router-modal">
        <header className="router-modal-header">
          <div>
            <h2>7router Settings</h2>
            <p>Storage provider</p>
          </div>
          <button className="router-icon-button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="router-modal-body">
          <div className="form-group">
            <label className="form-label">API URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="http://localhost:20131"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder={settings.hasAccessToken ? "********  (leave blank to keep current)" : "Bearer token"}
            />
          </div>

          {error && <div className="settings-error">{error}</div>}
        </div>

        <footer className="router-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !baseUrl.trim()}>
            {saving ? <><Loader size={13} className="spin" /> Saving...</> : <><Save size={13} /> Save</>}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function SevenRouterPage() {
  const [settings, setSettings] = useState<StorageSettings | null>(null);
  const [accessDirs, setAccessDirs] = useState<StorageAccessDirectory[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [items, setItems] = useState<StorageBrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  async function loadDirectories() {
    const data = await storageClient.listDirectories();
    setIsAdmin(data.isAdmin);
    setAccessDirs(data.directories ?? []);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const storageSettings = await settingsClient.getStorage();
        setSettings(storageSettings);
        await loadDirectories();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load storage.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function listDirectory(path: string) {
    setListing(true);
    setError("");
    try {
      const data = await storageClient.browse(path);
      const sorted = [...(data.items ?? [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage list failed.");
    } finally {
      setListing(false);
    }
  }

  function navigateTo(path: string) {
    setPathStack((stack) => [...stack, currentPath ?? ""]);
    void listDirectory(path);
  }

  function navigateBack() {
    const stack = [...pathStack];
    const previous = stack.pop() ?? "";
    setPathStack(stack);
    if (!previous) {
      setCurrentPath(null);
      setItems([]);
    } else {
      void listDirectory(previous);
    }
  }

  if (loading) {
    return (
      <section className="panel router-page">
        <div className="page-header">
          <h1 className="page-title">7router</h1>
        </div>
        <div className="router-empty"><Loader size={15} className="spin" /> Loading storage...</div>
      </section>
    );
  }

  return (
    <>
      {showSettings && settings && (
        <SevenRouterSettingsDialog
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => {
            setSettings(updated);
            setCurrentPath(null);
            setItems([]);
            setPathStack([]);
            void loadDirectories().catch((err) => setError(err instanceof Error ? err.message : "Failed to reload directories."));
          }}
        />
      )}

      <section className="panel router-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">7router</h1>
            <p className="page-subtitle">Browse files and folders from connected cloud storage.</p>
          </div>
          <div className="router-header-actions">
            {currentPath !== null && (
              <button className="btn btn-ghost" onClick={navigateBack} disabled={listing}>
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
              <Settings size={13} /> Settings
            </button>
          </div>
        </div>

        {error && <div className="settings-error">{error}</div>}

        <div className="router-card">
          <header className="router-card-header">
            <div className="router-card-title">
              <span>{currentPath === null ? "Accessible Directories" : "Directory Contents"}</span>
              {currentPath !== null && <code>{currentPath}</code>}
            </div>
            {currentPath !== null && (
              <div className="router-list-actions">
                <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                <button className="btn btn-ghost router-refresh" onClick={() => void listDirectory(currentPath)} disabled={listing}>
                  {listing ? <><Loader size={13} className="spin" /> Refreshing</> : <><RefreshCw size={13} /> Refresh</>}
                </button>
              </div>
            )}
          </header>

          {currentPath === null ? (
            accessDirs.length === 0 && !isAdmin ? (
              <div className="router-empty">
                <span>No accessible directories.</span>
                <button className="btn btn-primary" onClick={() => setShowSettings(true)}>Configure 7router</button>
              </div>
            ) : (
              <div className="router-list">
                {isAdmin && (
                  <div className="router-admin-row">
                    <span className="router-dot router-dot-warning" />
                    <span>Admin token - full access</span>
                  </div>
                )}
                {accessDirs.map((dir) => (
                  <button key={dir.path} className="router-row" onClick={() => navigateTo(dir.path)} disabled={listing}>
                    <Folder size={15} className="router-row-icon router-folder" />
                    <span className="router-row-main">
                      <span className="router-row-name">{dir.path}</span>
                    </span>
                    <span className="router-row-meta">{dir.access}</span>
                  </button>
                ))}
              </div>
            )
          ) : listing ? (
            <div className="router-empty"><Loader size={15} className="spin" /> Loading...</div>
          ) : items.length === 0 ? (
            <div className="router-empty">No files found.</div>
          ) : (
            <div className="router-list">
              {items.map((item) => (
                <div key={item.absolutePath} className="router-row">
                  {item.type === "folder"
                    ? <Folder size={15} className="router-row-icon router-folder" />
                    : <File size={15} className="router-row-icon router-file" />}
                  <span className="router-row-main">
                    {item.type === "folder" ? (
                      <button className="router-row-name router-linklike" onClick={() => navigateTo(item.absolutePath)} disabled={listing}>
                        {item.name}
                      </button>
                    ) : (
                      <span className="router-row-name">{item.name}</span>
                    )}
                    <code>{item.absolutePath}</code>
                  </span>
                  <span className="router-row-meta">{item.type}</span>
                  {item.sizeBytes !== undefined && <span className="router-row-meta">{formatBytes(item.sizeBytes)}</span>}
                  {item.cdnUrl && (
                    <a href={item.cdnUrl} target="_blank" rel="noopener noreferrer" className="router-open-link">
                      <ExternalLink size={13} /> Open
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

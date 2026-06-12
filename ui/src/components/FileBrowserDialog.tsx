import { ChevronRight, Folder, File, X, ArrowLeft, RefreshCw, Check } from "lucide-react";
import { useEffect, useState } from "react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

interface BrowseItem {
  name: string;
  absolutePath: string;
  type: "file" | "folder";
  sizeBytes?: number;
  cdnUrl?: string;
}

interface FileBrowserDialogProps {
  initialPath?: string;
  onSelect: (absolutePath: string) => void;
  onClose: () => void;
}

export function FileBrowserDialog({ initialPath = "", onSelect, onClose }: FileBrowserDialogProps) {
  const [path, setPath] = useState(initialPath);
  const [pathInput, setPathInput] = useState(initialPath);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (initialPath) {
      void browse(initialPath);
    } else {
      void loadRoot();
    }
  }, []);

  async function loadRoot() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/storage/directories`);
      if (!res.ok) throw new Error(`Failed to load directories: ${res.status}`);
      const data = (await res.json()) as { isAdmin: boolean; directories: { path: string; access: string }[] };
      const rootItems: BrowseItem[] = data.isAdmin
        ? []
        : data.directories.map((d) => ({
            name: d.path,
            absolutePath: d.path,
            type: "folder" as const
          }));
      setItems(rootItems);
      setPath("");
      setPathInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function browse(target: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/storage/browse?path=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
      const data = (await res.json()) as { items: BrowseItem[] };
      const sorted = [...(data.items ?? [])].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
      setPath(target);
      setPathInput(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  function navigateTo(target: string) {
    setHistory((h) => [...h, path]);
    if (target === "") {
      void loadRoot();
    } else {
      void browse(target);
    }
  }

  function goBack() {
    const prev = history[history.length - 1] ?? "";
    setHistory((h) => h.slice(0, -1));
    if (prev === "") {
      void loadRoot();
    } else {
      void browse(prev);
    }
  }

  function onPathInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (pathInput === "") {
        void loadRoot();
      } else {
        void browse(pathInput);
      }
    }
  }

  const breadcrumbs = path ? path.split("/").filter(Boolean) : [];

  return (
    <div className="fb-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fb-dialog">
        <div className="fb-header">
          <span className="fb-title">Browse Storage</span>
          <button className="fb-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="fb-toolbar">
          <button className="fb-btn-icon" onClick={goBack} disabled={history.length === 0} title="Back">
            <ArrowLeft size={14} />
          </button>
          <button className="fb-btn-icon" onClick={() => path === "" ? loadRoot() : browse(path)} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <input
            className="fb-path-input"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={onPathInputKeyDown}
            placeholder="CloudflareR2/account/bucket/folder"
            spellCheck={false}
          />
          {path && (
            <button className="fb-btn-select" onClick={() => onSelect(path)} title="Select this folder">
              <Check size={13} /> Select
            </button>
          )}
        </div>

        {breadcrumbs.length > 0 && (
          <div className="fb-breadcrumb">
            <button className="fb-crumb" onClick={() => navigateTo("")}>root</button>
            {breadcrumbs.map((crumb, i) => {
              const crumbPath = breadcrumbs.slice(0, i + 1).join("/");
              return (
                <span key={i} className="fb-crumb-wrap">
                  <ChevronRight size={12} className="fb-crumb-sep" />
                  <button className="fb-crumb" onClick={() => navigateTo(crumbPath)}>{crumb}</button>
                </span>
              );
            })}
          </div>
        )}

        <div className="fb-body">
          {loading && <div className="fb-status">Loading…</div>}
          {error && <div className="fb-error">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="fb-status">{path === "" ? "No accessible directories." : "Empty folder."}</div>
          )}
          {!loading && items.map((item) => (
            <button
              key={item.absolutePath}
              className={`fb-item ${item.type === "folder" ? "fb-item-folder" : "fb-item-file"}`}
              onClick={() => item.type === "folder" ? navigateTo(item.absolutePath) : onSelect(item.absolutePath)}
            >
              {item.type === "folder"
                ? <Folder size={15} className="fb-item-icon" />
                : <File size={15} className="fb-item-icon" />}
              <span className="fb-item-name">{item.name}</span>
              {item.sizeBytes !== undefined && item.type === "file" && (
                <span className="fb-item-size">{formatSize(item.sizeBytes)}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

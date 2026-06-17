import { BookOpen, Database, KeyRound, ListVideo, Loader, LogOut, Send, Video, Layers, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient, authExpiredEventName, clearAuthToken, getAuthToken, setAuthToken } from "./api/clients.js";
import { CreateZhihugenRenderPage } from "./pages/CreateZhihugenRenderPage.js";
import { RenderJobsPage } from "./pages/RenderJobsPage.js";
import { SevenRouterPage } from "./pages/SevenRouterPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TelegramPage } from "./pages/TelegramPage.js";
import { UsecasesPage } from "./pages/UsecasesPage.js";

type Page = "zhihugen" | "jobs" | "settings" | "7router" | "usecases" | "telegram";

export function App() {
  const [page, setPage] = useState<Page>("jobs");
  const [token, setToken] = useState(() => getAuthToken());
  const [systemSecret, setSystemSecret] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    function handleAuthExpired() {
      setToken("");
      setPage("jobs");
      setLoginError("Session expired. Sign in again.");
    }

    window.addEventListener(authExpiredEventName, handleAuthExpired);
    return () => window.removeEventListener(authExpiredEventName, handleAuthExpired);
  }, []);

  async function login() {
    setLoginError("");
    setLoggingIn(true);
    try {
      const response = await authClient.login(systemSecret);
      setAuthToken(response.accessToken);
      setToken(response.accessToken);
      setSystemSecret("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    clearAuthToken();
    setToken("");
    setPage("jobs");
  }

  if (!token) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="login-icon"><KeyRound size={18} /></div>
          <h1 className="login-title">VGen Admin</h1>
          {loginError && <div className="settings-error">{loginError}</div>}
          <div className="form-group">
            <label className="form-label">System secret</label>
            <input
              type="password"
              value={systemSecret}
              autoFocus
              onChange={(event) => setSystemSecret(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && systemSecret.trim()) void login();
              }}
            />
          </div>
          <button className="btn btn-primary login-button" onClick={login} disabled={loggingIn || !systemSecret.trim()}>
            {loggingIn ? <><Loader size={13} className="spin" /> Signing in...</> : <><KeyRound size={13} /> Sign in</>}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-icon"><Video size={16} /></div>
          <span className="nav-logo-text">VGen</span>
        </div>
        <div className="nav-links">
          <button className={page === "jobs" ? "active" : ""} onClick={() => setPage("jobs")}>
            <ListVideo size={16} className="nav-icon" /><span className="nav-label">Jobs</span>
          </button>
          <button className={page === "zhihugen" ? "active" : ""} onClick={() => setPage("zhihugen")}>
            <Layers size={16} className="nav-icon" /><span className="nav-label">Zhihugen</span>
          </button>
          <button className={page === "7router" ? "active" : ""} onClick={() => setPage("7router")}>
            <Database size={16} className="nav-icon" /><span className="nav-label">7router</span>
          </button>
          <button className={page === "telegram" ? "active" : ""} onClick={() => setPage("telegram")}>
            <Send size={16} className="nav-icon" /><span className="nav-label">Telegram</span>
          </button>
          <button className={page === "usecases" ? "active" : ""} onClick={() => setPage("usecases")}>
            <BookOpen size={16} className="nav-icon" /><span className="nav-label">Usecases</span>
          </button>
          <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>
            <Settings size={16} className="nav-icon" /><span className="nav-label">Settings</span>
          </button>
        </div>
        <button className="nav-logout" onClick={logout} title="Sign out">
          <LogOut size={16} />
        </button>
      </nav>
      {page === "jobs" && <RenderJobsPage />}
      {page === "zhihugen" && <CreateZhihugenRenderPage />}
      {page === "7router" && <SevenRouterPage />}
      {page === "telegram" && <TelegramPage />}
      {page === "usecases" && <UsecasesPage />}
      {page === "settings" && <SettingsPage />}
    </main>
  );
}

import { ListVideo, Video, Layers, Settings } from "lucide-react";
import { useState } from "react";
import { CreateZhihugenRenderPage } from "./pages/CreateZhihugenRenderPage.js";
import { RenderJobsPage } from "./pages/RenderJobsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

type Page = "zhihugen" | "jobs" | "settings";

export function App() {
  const [page, setPage] = useState<Page>("jobs");
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
          <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")}>
            <Settings size={16} className="nav-icon" /><span className="nav-label">Settings</span>
          </button>
        </div>
      </nav>
      {page === "jobs" && <RenderJobsPage />}
      {page === "zhihugen" && <CreateZhihugenRenderPage />}
      {page === "settings" && <SettingsPage />}
    </main>
  );
}

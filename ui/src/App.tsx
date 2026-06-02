import { Settings, Clapperboard, ListVideo, PlaySquare } from "lucide-react";
import { useState } from "react";
import { CreateCompositeRenderPage } from "./pages/CreateCompositeRenderPage.js";
import { CreateIntroRenderPage } from "./pages/CreateIntroRenderPage.js";
import { RenderJobsPage } from "./pages/RenderJobsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";

type Page = "settings" | "composite" | "intro" | "jobs";

export function App() {
  const [page, setPage] = useState<Page>("jobs");
  return (
    <main className="shell">
      <nav className="nav">
        <button className={page === "jobs" ? "active" : ""} onClick={() => setPage("jobs")} title="Jobs"><ListVideo size={18} /> Jobs</button>
        <button className={page === "composite" ? "active" : ""} onClick={() => setPage("composite")} title="Composite"><Clapperboard size={18} /> Composite</button>
        <button className={page === "intro" ? "active" : ""} onClick={() => setPage("intro")} title="Intro"><PlaySquare size={18} /> Intro</button>
        <button className={page === "settings" ? "active" : ""} onClick={() => setPage("settings")} title="Settings"><Settings size={18} /> Settings</button>
      </nav>
      {page === "jobs" && <RenderJobsPage />}
      {page === "composite" && <CreateCompositeRenderPage />}
      {page === "intro" && <CreateIntroRenderPage />}
      {page === "settings" && <SettingsPage />}
    </main>
  );
}

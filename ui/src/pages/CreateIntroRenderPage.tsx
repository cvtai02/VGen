import { Plus } from "lucide-react";
import { useState } from "react";
import { renderClient } from "../api/clients.js";

export function CreateIntroRenderPage() {
  const [originVideoUrl, setOriginVideoUrl] = useState("");
  const [introText, setIntroText] = useState("");
  const [result, setResult] = useState("");

  async function create() {
    const response = await renderClient.createIntroRenderJob({
      aspectRatio: "9:16",
      originVideo: { source: "url", url: originVideoUrl },
      introText,
      introDurationSeconds: 3,
      backgroundMusic: { source: "none" }
    });
    setResult(JSON.stringify(response, null, 2));
  }

  return (
    <section className="panel">
      <h1>Intro Render</h1>
      <label>Origin video URL<input value={originVideoUrl} onChange={(event) => setOriginVideoUrl(event.target.value)} /></label>
      <label>Intro text<textarea className="short" value={introText} onChange={(event) => setIntroText(event.target.value)} /></label>
      <button onClick={create}><Plus size={16} /> Create job</button>
      {result && <pre>{result}</pre>}
    </section>
  );
}

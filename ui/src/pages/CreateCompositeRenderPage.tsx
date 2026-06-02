import { Plus } from "lucide-react";
import { useState } from "react";
import { renderClient } from "../api/clients.js";

export function CreateCompositeRenderPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [tts, setTts] = useState(true);
  const [result, setResult] = useState("");

  async function create() {
    const response = await renderClient.createCompositeRenderJob({
      aspectRatio: "9:16",
      backgroundVideo: { source: "default" },
      backgroundMusic: { source: "default", volume: 0.8 },
      images: [{ url: imageUrl, scriptText }],
      tts: { enabled: tts }
    });
    setResult(JSON.stringify(response, null, 2));
  }

  return (
    <section className="panel">
      <h1>Composite Render</h1>
      <label>Image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
      <label>Script text<textarea className="short" value={scriptText} onChange={(event) => setScriptText(event.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={tts} onChange={(event) => setTts(event.target.checked)} /> TTS</label>
      <button onClick={create}><Plus size={16} /> Create job</button>
      {result && <pre>{result}</pre>}
    </section>
  );
}

import { AbsoluteFill } from "remotion";
import { BackgroundMusicLayer } from "./BackgroundMusicLayer.js";
import { BackgroundVideoLayer } from "./BackgroundVideoLayer.js";
import { ImageScriptScene } from "./ImageScriptScene.js";

export function CompositeVideoTemplate() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#111827", color: "white", justifyContent: "center", alignItems: "center" }}>
      <BackgroundVideoLayer />
      <ImageScriptScene />
      <BackgroundMusicLayer />
    </AbsoluteFill>
  );
}

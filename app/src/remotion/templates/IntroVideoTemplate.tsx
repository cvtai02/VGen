import { AbsoluteFill } from "remotion";
import { BackgroundMusicLayer } from "./BackgroundMusicLayer.js";
import { BackgroundVideoLayer } from "./BackgroundVideoLayer.js";
import { IntroTextLayer } from "./IntroTextLayer.js";

export function IntroVideoTemplate() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", color: "white", justifyContent: "center", alignItems: "center" }}>
      <BackgroundVideoLayer />
      <IntroTextLayer />
      <BackgroundMusicLayer />
    </AbsoluteFill>
  );
}

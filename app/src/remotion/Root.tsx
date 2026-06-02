import { Composition } from "remotion";
import { CompositeVideoComposition } from "./compositions/CompositeVideoComposition.js";
import { IntroVideoComposition } from "./compositions/IntroVideoComposition.js";

export function Root() {
  return (
    <>
      <Composition
        id="CompositeVideo"
        component={CompositeVideoComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="IntroVideo"
        component={IntroVideoComposition}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
}

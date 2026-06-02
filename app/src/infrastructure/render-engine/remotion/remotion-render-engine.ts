import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderEngine, RenderEngineInput, RenderEngineOutput } from "../../../core/shared-kernel/contracts/render-engine.js";
import { createRemotionOutputPath } from "./remotion-output-path.js";

export class RemotionRenderEngine implements RenderEngine {
  constructor(private readonly outputDirectory: string) {}

  async render(input: RenderEngineInput): Promise<RenderEngineOutput> {
    await mkdir(this.outputDirectory, { recursive: true });
    const localPath = createRemotionOutputPath(this.outputDirectory, input.renderJobId);
    await writeFile(localPath, `Mock MP4 payload for ${input.type} render ${input.renderJobId}\n`, "utf8");
    return {
      localPath: path.resolve(localPath),
      format: "mp4"
    };
  }
}

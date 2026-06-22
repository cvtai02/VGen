export type RenderProgressStep = "tts" | "rendering";

export interface RenderEngineInput {
  renderJobId: string;
  type: string;
  request: unknown;
  onProgress?: (step: RenderProgressStep, status: "started" | "completed") => void;
  bgVideoReady?: Promise<string>;
}

export interface RenderEngineOutput {
  localPath: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  format: "mp4";
}

export interface RenderEngine {
  render(input: RenderEngineInput): Promise<RenderEngineOutput>;
}

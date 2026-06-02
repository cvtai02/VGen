export interface RenderEngineInput {
  renderJobId: string;
  type: string;
  request: unknown;
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

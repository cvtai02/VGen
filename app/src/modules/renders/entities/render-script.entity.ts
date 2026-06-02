export class RenderScriptEntity {
  constructor(public readonly text: string, public readonly durationSeconds?: number) {
    if (!text.trim()) {
      throw new Error("Render script text is required.");
    }
    if (durationSeconds !== undefined && durationSeconds <= 0) {
      throw new Error("Render script duration must be positive.");
    }
  }
}

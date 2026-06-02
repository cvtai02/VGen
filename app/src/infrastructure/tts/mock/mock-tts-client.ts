import type { TtsClient, TtsInput, TtsResult } from "../../../core/shared-kernel/contracts/tts-client.js";

export class MockTtsClient implements TtsClient {
  async synthesize(input: TtsInput): Promise<TtsResult> {
    return {
      audioUrl: `mock://tts/${encodeURIComponent(input.voice ?? "default")}/${encodeURIComponent(input.text)}.mp3`,
      durationSeconds: Math.max(1, Math.ceil(input.text.length / 14))
    };
  }
}

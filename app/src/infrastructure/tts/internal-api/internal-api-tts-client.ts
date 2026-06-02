import type { TtsClient, TtsInput, TtsResult } from "../../../core/shared-kernel/contracts/tts-client.js";

export class InternalApiTtsClient implements TtsClient {
  constructor(private readonly baseUrl: string, private readonly accessToken: string) {}

  async synthesize(input: TtsInput): Promise<TtsResult> {
    const response = await fetch(`${this.baseUrl}/tts/synthesize`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }

    return response.json() as Promise<TtsResult>;
  }
}

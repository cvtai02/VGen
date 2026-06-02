export interface TtsInput {
  text: string;
  voice?: string;
}

export interface TtsResult {
  audioUrl: string;
  durationSeconds?: number;
}

export interface TtsClient {
  synthesize(input: TtsInput): Promise<TtsResult>;
}

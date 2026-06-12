import type { MediaSourceClient, MediaSourceResult, MediaStreamsResult } from "../../../core/shared-kernel/contracts/media-source-client.js";

export class InternalApiMediaSourceClient implements MediaSourceClient {
  constructor(private readonly baseUrl: string, private readonly accessToken: string) {}

  getDefaultVideo(): Promise<MediaSourceResult> {
    return this.request("/media/default-video");
  }

  getDefaultMusic(): Promise<MediaSourceResult> {
    return this.request("/media/default-music");
  }

  findVideoByDescription(description: string): Promise<MediaSourceResult> {
    return this.request(`/media/video?description=${encodeURIComponent(description)}`);
  }

  findMusicByDescription(description: string): Promise<MediaSourceResult> {
    return this.request(`/media/music?description=${encodeURIComponent(description)}`);
  }

  async findStreamsByDescription(description: string): Promise<MediaStreamsResult> {
    const response = await fetch(`${this.baseUrl}/media/streams`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ description })
    });
    if (!response.ok) {
      throw new Error(`Media streams request failed: ${response.status}`);
    }
    return response.json() as Promise<MediaStreamsResult>;
  }

  private async request(path: string): Promise<MediaSourceResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { authorization: `Bearer ${this.accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Media source request failed: ${response.status}`);
    }

    return response.json() as Promise<MediaSourceResult>;
  }
}

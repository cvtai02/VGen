import type { MediaSourceClient, MediaSourceResult, MediaStreamsResult } from "../../../core/shared-kernel/contracts/media-source-client.js";

export class MockMediaSourceClient implements MediaSourceClient {
  async getDefaultVideo(): Promise<MediaSourceResult> {
    return { url: "mock://media/default-video.mp4", source: "default" };
  }

  async getDefaultMusic(): Promise<MediaSourceResult> {
    return { url: "mock://media/default-music.mp3", source: "default" };
  }

  async findVideoByDescription(description: string): Promise<MediaSourceResult> {
    return { url: `mock://media/video/${encodeURIComponent(description)}.mp4`, source: "description" };
  }

  async findMusicByDescription(description: string): Promise<MediaSourceResult> {
    return { url: `mock://media/music/${encodeURIComponent(description)}.mp3`, source: "description" };
  }

  async findStreamsByDescription(description: string): Promise<MediaStreamsResult> {
    return {
      items: [
        {
          id: `mock-stream-1`,
          name: `${description}.mp4`,
          mimeType: "video/mp4",
          path: `/mock/streams/${encodeURIComponent(description)}.mp4`,
          cdnUrl: `mock://media/streams/${encodeURIComponent(description)}.mp4`
        }
      ]
    };
  }
}

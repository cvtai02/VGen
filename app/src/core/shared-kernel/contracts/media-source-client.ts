export interface MediaSourceResult {
  url: string;
  source: "default" | "description";
}

export interface MediaSourceClient {
  getDefaultVideo(): Promise<MediaSourceResult>;
  getDefaultMusic(): Promise<MediaSourceResult>;
  findVideoByDescription(description: string): Promise<MediaSourceResult>;
  findMusicByDescription(description: string): Promise<MediaSourceResult>;
}

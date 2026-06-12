export interface MediaSourceResult {
  url: string;
  source: "default" | "description";
}

export interface MediaStreamItem {
  id: string;
  name: string;
  mimeType: string;
  path: string;
  cdnUrl: string;
}

export interface MediaStreamsResult {
  items: MediaStreamItem[];
}

export interface MediaSourceClient {
  getDefaultVideo(): Promise<MediaSourceResult>;
  getDefaultMusic(): Promise<MediaSourceResult>;
  findVideoByDescription(description: string): Promise<MediaSourceResult>;
  findMusicByDescription(description: string): Promise<MediaSourceResult>;
  findStreamsByDescription(description: string): Promise<MediaStreamsResult>;
}

export interface CreateIntroRenderJobRequestDto {
  title?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  originVideo: {
    source: "url";
    url: string;
  };
  introText: string;
  introDurationSeconds?: number;
  backgroundMusic?: {
    source: "none" | "default" | "url";
    url?: string;
    volume?: number;
  };
}

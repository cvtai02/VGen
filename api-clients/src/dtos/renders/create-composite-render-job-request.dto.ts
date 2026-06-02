export interface CreateCompositeRenderJobRequestDto {
  title?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  backgroundVideo?: {
    source: "default" | "url" | "description";
    url?: string;
    description?: string;
  };
  backgroundMusic?: {
    source: "default" | "url" | "description";
    url?: string;
    description?: string;
    volume?: number;
  };
  images: Array<{
    url: string;
    scriptText: string;
    durationSeconds?: number;
    overlayText?: string;
  }>;
  tts?: {
    enabled: boolean;
    voice?: string;
  };
}

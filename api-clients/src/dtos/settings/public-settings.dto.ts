export interface PublicSettingsDto {
  app: {
    baseUrl: string;
    publicBaseUrl: string;
    adminAccessToken: string;
  };
  database: {
    provider: "postgresql";
    url: string;
  };
  redis: {
    url: string;
  };
  render: {
    defaultWidth: number;
    defaultHeight: number;
    defaultFps: number;
    defaultFormat: "mp4";
    outputDirectory: string;
    concurrency: number;
  };
  storage: {
    provider: "mock" | "internal-api";
    internalApiBaseUrl: string;
    accessToken: string;
  };
  tts: {
    provider: "mock" | "internal-api";
    internalApiBaseUrl: string;
    accessToken: string;
    defaultVoice: string;
  };
  mediaSource: {
    provider: "mock" | "internal-api";
    internalApiBaseUrl: string;
    accessToken: string;
    enableDescriptionSearch: boolean;
  };
  featureFlags: {
    enableFetchMediaByDescription: boolean;
    enableIntroVideoFlow: boolean;
    enableCompositeVideoFlow: boolean;
  };
}

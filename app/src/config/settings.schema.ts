import { z } from "zod";

export const runtimeSettingsSchema = z.object({
  app: z.object({
    baseUrl: z.string().url(),
    publicBaseUrl: z.string().url()
  }),
  render: z.object({
    defaultWidth: z.number().int().positive(),
    defaultHeight: z.number().int().positive(),
    defaultFps: z.number().int().positive(),
    defaultFormat: z.literal("mp4"),
    outputDirectory: z.string().min(1),
    concurrency: z.number().int().positive()
  }),
  storage: z.object({
    baseUrl: z.string(),
    accessToken: z.string(),
    absolutePathPrefix: z.string()
  }),
  tts: z.object({
    baseUrl: z.string(),
    apiKey: z.string()
  }),
  mediaSource: z.object({
    provider: z.enum(["mock", "internal-api"]),
    internalApiBaseUrl: z.string(),
    accessToken: z.string(),
    enableDescriptionSearch: z.boolean()
  }),
  featureFlags: z.object({
    enableFetchMediaByDescription: z.boolean(),
    enableIntroVideoFlow: z.boolean(),
    enableCompositeVideoFlow: z.boolean(),
    enableZhihugenFlow: z.boolean()
  })
});

export type RuntimeSettings = z.infer<typeof runtimeSettingsSchema>;

export const settingsSchema = runtimeSettingsSchema;

export const defaultSettings: RuntimeSettings = {
  app: {
    baseUrl: "http://localhost:3000",
    publicBaseUrl: "http://localhost:3000"
  },
  render: {
    defaultWidth: 1080,
    defaultHeight: 1920,
    defaultFps: 30,
    defaultFormat: "mp4",
    outputDirectory: "./tmp/renders",
    concurrency: 1
  },
  storage: {
    baseUrl: "",
    accessToken: "",
    absolutePathPrefix: ""
  },
  tts: {
    baseUrl: "",
    apiKey: ""
  },
  mediaSource: {
    provider: "mock",
    internalApiBaseUrl: "",
    accessToken: "",
    enableDescriptionSearch: false
  },
  featureFlags: {
    enableFetchMediaByDescription: false,
    enableIntroVideoFlow: true,
    enableCompositeVideoFlow: true,
    enableZhihugenFlow: true
  }
};

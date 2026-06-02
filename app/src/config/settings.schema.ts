import { z } from "zod";

export const settingsSchema = z.object({
  app: z.object({
    baseUrl: z.string().url(),
    publicBaseUrl: z.string().url(),
    adminAccessToken: z.string().min(1)
  }),
  database: z.object({
    provider: z.literal("postgresql"),
    url: z.string().min(1)
  }),
  redis: z.object({
    url: z.string().min(1)
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
    provider: z.enum(["mock", "internal-api"]),
    internalApiBaseUrl: z.string(),
    accessToken: z.string()
  }),
  tts: z.object({
    provider: z.enum(["mock", "internal-api"]),
    internalApiBaseUrl: z.string(),
    accessToken: z.string(),
    defaultVoice: z.string().min(1)
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
    enableCompositeVideoFlow: z.boolean()
  })
});

export type RuntimeSettings = z.infer<typeof settingsSchema>;

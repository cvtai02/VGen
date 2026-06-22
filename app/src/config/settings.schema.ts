import { z } from "zod";

export const defaultTelegramSettings = {
  bots: []
};

export const defaultStorageSettings = {
  baseUrl: "https://7router-api.minfect.com",
  accessToken: "",
  tempUploadExpiresInSeconds: 900
};

const telegramDestinationSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  name: z.string(),
  type: z.string().optional(),
  username: z.string().optional()
});

const telegramBotSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().optional(),
  botToken: z.string(),
  destinations: z.array(telegramDestinationSchema).default([])
});

const telegramSettingsSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return defaultTelegramSettings;
  const raw = value as Record<string, unknown>;
  if (Array.isArray(raw.bots)) return { bots: raw.bots };

  const botToken = typeof raw.botToken === "string" ? raw.botToken : "";
  const chatId = typeof raw.chatId === "string" ? raw.chatId : "";
  return {
    bots: botToken || chatId
      ? [{
        id: "legacy-telegram-bot",
        name: "Telegram Bot",
        botToken,
        destinations: chatId
          ? [{ id: "legacy-telegram-chat", chatId, name: chatId }]
          : []
      }]
      : []
  };
}, z.object({
  bots: z.array(telegramBotSchema).default([])
}));

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
  tts: z.object({
    baseUrl: z.string(),
    apiKey: z.string(),
    provider: z.string().default("elevenlabs"),
    voiceModel: z.string().default("")
  }),
  storage: z.object({
    baseUrl: z.string(),
    accessToken: z.string(),
    tempUploadExpiresInSeconds: z.number().int().positive().default(900)
  }).default(defaultStorageSettings),
  telegram: telegramSettingsSchema.default(defaultTelegramSettings),
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
export type TelegramSettings = z.infer<typeof telegramSettingsSchema>;
export type TelegramBotSettings = z.infer<typeof telegramBotSchema>;
export type TelegramDestinationSettings = z.infer<typeof telegramDestinationSchema>;

export const defaultSettings: RuntimeSettings = {
  app: {
    baseUrl: "http://localhost:3012",
    publicBaseUrl: "http://localhost:3012"
  },
  render: {
    defaultWidth: 1080,
    defaultHeight: 1920,
    defaultFps: 30,
    defaultFormat: "mp4",
    outputDirectory: "./tmp/renders",
    concurrency: 1
  },
  tts: {
    baseUrl: "https://meddler.minfect.com",
    apiKey: "",
    provider: "elevenlabs",
    voiceModel: ""
  },
  storage: { ...defaultStorageSettings },
  telegram: { ...defaultTelegramSettings },
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

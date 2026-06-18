import { z } from "zod";

export const defaultTelegramCaptionTemplate = "{label}\n\n{cdnUrl}";

export const defaultTelegramSettings = {
  enabled: false,
  captionTemplate: defaultTelegramCaptionTemplate,
  bots: []
};

const telegramDestinationSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  name: z.string(),
  type: z.string().optional(),
  username: z.string().optional(),
  enabled: z.boolean().default(true)
});

const telegramBotSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().optional(),
  botToken: z.string(),
  enabled: z.boolean().default(true),
  destinations: z.array(telegramDestinationSchema).default([])
});

const telegramSettingsSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object") return defaultTelegramSettings;
  const raw = value as Record<string, unknown>;
  if (Array.isArray(raw.bots)) return raw;

  const botToken = typeof raw.botToken === "string" ? raw.botToken : "";
  const chatId = typeof raw.chatId === "string" ? raw.chatId : "";
  const captionTemplate = typeof raw.captionTemplate === "string" ? raw.captionTemplate : defaultTelegramCaptionTemplate;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : false,
    captionTemplate,
    bots: botToken || chatId
      ? [{
        id: "legacy-telegram-bot",
        name: "Telegram Bot",
        botToken,
        enabled: true,
        destinations: chatId
          ? [{ id: "legacy-telegram-chat", chatId, name: chatId, enabled: true }]
          : []
      }]
      : []
  };
}, z.object({
  enabled: z.boolean(),
  captionTemplate: z.string(),
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
    apiKey: z.string()
  }),
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
    baseUrl: "",
    apiKey: ""
  },
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

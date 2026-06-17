import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerAddTelegramBotApi } from "./add-telegram-bot.api.js";
import { registerAddTelegramDestinationApi } from "./add-telegram-destination.api.js";
import { registerBrowseStorageApi } from "./browse-storage.api.js";
import { registerDeleteTelegramBotApi } from "./delete-telegram-bot.api.js";
import { registerDeleteTelegramDestinationApi } from "./delete-telegram-destination.api.js";
import { registerGetRenderJobApi } from "./get-render-job.api.js";
import { registerListRenderJobsApi } from "./list-render-jobs.api.js";
import { registerRenderHealthApi } from "./render-health.api.js";
import { registerStorageSettingsApi } from "./storage-settings.api.js";
import { registerSyncTelegramBotApi } from "./sync-telegram-bot.api.js";
import { registerTelegramSettingsApi } from "./telegram-settings.api.js";
import { registerTtsSettingsApi } from "./tts-settings.api.js";
import { registerUpdateTelegramBotApi } from "./update-telegram-bot.api.js";
import { registerUpdateTelegramDestinationApi } from "./update-telegram-destination.api.js";

export async function registerRenderApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerRenderHealthApi(app);
  await registerBrowseStorageApi(app, container);
  await registerGetRenderJobApi(app, container);
  await registerListRenderJobsApi(app, container);
  await registerStorageSettingsApi(app, container);
  await registerTelegramSettingsApi(app, container);
  await registerAddTelegramBotApi(app, container);
  await registerUpdateTelegramBotApi(app, container);
  await registerDeleteTelegramBotApi(app, container);
  await registerSyncTelegramBotApi(app, container);
  await registerAddTelegramDestinationApi(app, container);
  await registerUpdateTelegramDestinationApi(app, container);
  await registerDeleteTelegramDestinationApi(app, container);
  await registerTtsSettingsApi(app, container);
}

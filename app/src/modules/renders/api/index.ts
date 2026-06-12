import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerBrowseStorageApi } from "./browse-storage.api.js";
import { registerGetRenderJobApi } from "./get-render-job.api.js";
import { registerListRenderJobsApi } from "./list-render-jobs.api.js";
import { registerRenderHealthApi } from "./render-health.api.js";
import { registerStorageSettingsApi } from "./storage-settings.api.js";
import { registerTtsSettingsApi } from "./tts-settings.api.js";

export async function registerRenderApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerRenderHealthApi(app);
  await registerBrowseStorageApi(app, container);
  await registerGetRenderJobApi(app, container);
  await registerListRenderJobsApi(app, container);
  await registerStorageSettingsApi(app, container);
  await registerTtsSettingsApi(app, container);
}

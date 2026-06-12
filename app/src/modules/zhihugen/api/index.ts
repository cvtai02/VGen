import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerTtsModelsApis } from "./tts-models.api.js";
import { registerZhihugenJobsApis } from "./zhihugen-jobs.api.js";
import { registerZhihugenRenderApis } from "./zhihugen-render.api.js";
import { registerZhihugenSettingsApis } from "./zhihugen-settings.api.js";

export async function registerZhihugenApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerZhihugenRenderApis(app, container);
  await registerZhihugenJobsApis(app, container);
  await registerZhihugenSettingsApis(app, container);
  await registerTtsModelsApis(app, container);
}

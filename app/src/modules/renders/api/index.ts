import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerCreateCompositeRenderJobApi } from "./create-composite-render-job.api.js";
import { registerCreateIntroRenderJobApi } from "./create-intro-render-job.api.js";
import { registerGetRenderJobApi } from "./get-render-job.api.js";
import { registerListRenderJobsApi } from "./list-render-jobs.api.js";
import { registerRenderHealthApi } from "./render-health.api.js";

export async function registerRenderApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerRenderHealthApi(app);
  await registerCreateCompositeRenderJobApi(app, container);
  await registerCreateIntroRenderJobApi(app, container);
  await registerGetRenderJobApi(app, container);
  await registerListRenderJobsApi(app, container);
}

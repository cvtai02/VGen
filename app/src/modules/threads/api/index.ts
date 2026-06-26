import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerScrapeThreadsApi } from "./scrape-threads.api.js";

export async function registerThreadsApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerScrapeThreadsApi(app, container.scrapeThreadsPostUseCase);
}

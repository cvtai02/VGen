import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppContainer } from "./container.js";
import { registerRenderApis } from "./modules/renders/api/index.js";
import { registerSettingsApis } from "./modules/settings/api/index.js";

export async function createServer(container: AppContainer) {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  await registerRenderApis(app, container);
  await registerSettingsApis(app, container);
  return app;
}

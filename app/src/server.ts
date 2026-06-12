import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppContainer } from "./container.js";
import { registerRenderApis } from "./modules/renders/api/index.js";
import { registerZhihugenApis } from "./modules/zhihugen/api/index.js";

export async function createServer(container: AppContainer) {
  const app = Fastify({ logger: true, bodyLimit: 100 * 1024 * 1024 });
  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: "*"
  });
  await registerRenderApis(app, container);
  await registerZhihugenApis(app, container);
  return app;
}

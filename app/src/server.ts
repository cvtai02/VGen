import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppContainer } from "./container.js";
import { apiError } from "./core/shared-kernel/api-error.js";
import { registerAuthApis } from "./modules/auth/api/index.js";
import { registerRenderApis } from "./modules/renders/api/index.js";
import { registerZhihugenApis } from "./modules/zhihugen/api/index.js";
import { registerThreadsApis } from "./modules/threads/api/index.js";

export async function createServer(container: AppContainer) {
  const app = Fastify({ logger: true, bodyLimit: 100 * 1024 * 1024 });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: "*",
    credentials: false
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const message = statusCode >= 500 ? "Internal Server Error" : error.message;
    if (statusCode >= 500) app.log.error(error);
    reply.code(statusCode).send(apiError(statusCode, statusCode >= 500 ? "Internal Server Error" : error.name, message));
  });

  await registerAuthApis(app, container);
  app.addHook("preHandler", async (request, reply) => {
    if (request.method === "OPTIONS") return;
    if (!request.url.startsWith("/api/")) return;
    if (request.url === "/api/auth/login" || request.url === "/api/health") return;

    if (!await container.verifyAdminAccessTokenUseCase.execute(request.headers.authorization)) {
      return reply.code(401).send(apiError(401, "Unauthorized", "Missing or invalid bearer token."));
    }
  });

  await registerRenderApis(app, container);
  await registerZhihugenApis(app, container);
  await registerThreadsApis(app, container);
  return app;
}

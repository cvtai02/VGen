import type { FastifyInstance } from "fastify";

export async function registerRenderHealthApi(app: FastifyInstance): Promise<void> {
  app.get("/api/health", async () => ({ ok: true }));
}

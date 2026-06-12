import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";

export async function registerBrowseStorageApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  function headers(accessToken: string) {
    return { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
  }

  app.get("/api/storage/directories", async (_request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl) return reply.code(503).send({ message: "Storage not configured." });

    const res = await fetch(`${baseUrl}/access/directories`, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return reply.code(res.status).send({ message: `7router directories failed: ${res.status}` });
    return res.json();
  });

  app.get<{ Querystring: { path?: string } }>("/api/storage/browse", async (request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl) return reply.code(503).send({ message: "Storage not configured." });

    const path = request.query.path ?? "";
    const res = await fetch(`${baseUrl}/files/list`, {
      method: "POST",
      headers: headers(accessToken),
      body: JSON.stringify({ path })
    });
    if (!res.ok) return reply.code(res.status).send({ message: `7router list failed: ${res.status}` });
    return res.json();
  });
}

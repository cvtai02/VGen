import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";

export async function registerBrowseStorageApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  function headers(accessToken: string) {
    return { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
  }

  function normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  app.get("/api/storage/directories", async (_request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl) return reply.code(503).send(apiError(503, "Service Unavailable", "Storage not configured."));
    if (!accessToken) return reply.code(503).send(apiError(503, "Service Unavailable", "Storage access token not configured."));

    try {
      const res = await fetch(`${normalizeBaseUrl(baseUrl)}/access/directories`, {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return reply.code(res.status).send(apiError(res.status, res.statusText, `7router directories failed: ${res.status}`));
      return res.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage error.";
      return reply.code(502).send(apiError(502, "Bad Gateway", `7router directories failed: ${message}`));
    }
  });

  app.get<{ Querystring: { path?: string } }>("/api/storage/browse", async (request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl) return reply.code(503).send(apiError(503, "Service Unavailable", "Storage not configured."));
    if (!accessToken) return reply.code(503).send(apiError(503, "Service Unavailable", "Storage access token not configured."));

    const path = request.query.path ?? "";
    try {
      const res = await fetch(`${normalizeBaseUrl(baseUrl)}/files/list`, {
        method: "POST",
        headers: headers(accessToken),
        body: JSON.stringify({ path })
      });
      if (!res.ok) return reply.code(res.status).send(apiError(res.status, res.statusText, `7router list failed: ${res.status}`));
      return res.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown storage error.";
      return reply.code(502).send(apiError(502, "Bad Gateway", `7router list failed: ${message}`));
    }
  });
}

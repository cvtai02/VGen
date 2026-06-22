import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { StorageSettingsResponseDto } from "../dtos/storage-settings-response.dto.js";
import type { UpdateStorageSettingsRequestDto } from "../dtos/update-storage-settings-request.dto.js";

const MASKED_SECRET = "********";

function redact(secret: string): string {
  return secret ? MASKED_SECRET : "";
}

export async function registerStorageSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: StorageSettingsResponseDto }>("/api/settings/storage", async () => {
    const { baseUrl, accessToken, tempUploadExpiresInSeconds } = container.settings.storage;
    return { baseUrl, accessToken: redact(accessToken), hasAccessToken: !!accessToken, tempUploadExpiresInSeconds };
  });

  app.post("/api/settings/storage/test", async (_request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl.trim()) return reply.code(400).send({ ok: false, error: "Base URL is not configured." });
    if (!accessToken) return reply.code(400).send({ ok: false, error: "Access token is not configured." });
    try {
      const url = `${baseUrl.trim().replace(/\/+$/, "")}/files/temp-upload-url`;
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ path: "__connection_test__/probe.txt", expiresInSeconds: 60 })
      });
      if (!res.ok) throw new Error(`7router responded ${res.status}`);
      return { ok: true };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: err instanceof Error ? err.message : "Connection failed." });
    }
  });

  app.get("/api/settings/storage/directories", async (_request, reply) => {
    const { baseUrl, accessToken } = container.settings.storage;
    if (!baseUrl.trim()) return reply.code(400).send(apiError(400, "Bad Request", "7router base URL is not configured."));
    if (!accessToken) return reply.code(400).send(apiError(400, "Bad Request", "7router access token is not configured."));
    try {
      const url = `${baseUrl.trim().replace(/\/+$/, "")}/access/directories`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) throw new Error(`7router responded ${res.status}`);
      return await res.json();
    } catch (err) {
      return reply.code(502).send(apiError(502, "Bad Gateway", err instanceof Error ? err.message : "Failed to fetch directories."));
    }
  });

  app.post<{ Body: UpdateStorageSettingsRequestDto; Reply: StorageSettingsResponseDto | { statusCode: number; error: string; message: string } }>("/api/settings/storage", async (request, reply) => {
    const { baseUrl, accessToken, tempUploadExpiresInSeconds } = request.body ?? {};
    if (tempUploadExpiresInSeconds !== undefined && (!Number.isInteger(tempUploadExpiresInSeconds) || tempUploadExpiresInSeconds <= 0)) {
      return reply.code(400).send(apiError(400, "Bad Request", "tempUploadExpiresInSeconds must be a positive integer."));
    }
    const nextAccessToken =
      accessToken === undefined || accessToken === MASKED_SECRET
        ? container.settings.storage.accessToken
        : accessToken;

    const updated = {
      ...container.settings,
      storage: {
        baseUrl: baseUrl ?? container.settings.storage.baseUrl,
        accessToken: nextAccessToken,
        tempUploadExpiresInSeconds: tempUploadExpiresInSeconds ?? container.settings.storage.tempUploadExpiresInSeconds
      }
    };

    await container.settingsLoader.save(updated);
    container.settings.storage = updated.storage;
    return reply.code(200).send({
      baseUrl: updated.storage.baseUrl,
      accessToken: redact(updated.storage.accessToken),
      hasAccessToken: !!updated.storage.accessToken,
      tempUploadExpiresInSeconds: updated.storage.tempUploadExpiresInSeconds
    });
  });
}

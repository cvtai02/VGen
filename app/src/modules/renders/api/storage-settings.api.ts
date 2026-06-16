import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { StorageSettingsResponseDto } from "../dtos/storage-settings-response.dto.js";
import type { UpdateStorageSettingsRequestDto } from "../dtos/update-storage-settings-request.dto.js";

const MASKED_SECRET = "********";

function redact(secret: string): string {
  return secret ? MASKED_SECRET : "";
}

export async function registerStorageSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: StorageSettingsResponseDto }>("/api/settings/storage", async () => {
    const { baseUrl, accessToken } = container.settings.storage;
    return { baseUrl, accessToken: redact(accessToken), hasAccessToken: !!accessToken };
  });

  app.post<{ Body: UpdateStorageSettingsRequestDto; Reply: StorageSettingsResponseDto }>("/api/settings/storage", async (request, reply) => {
    const { baseUrl, accessToken } = request.body ?? {};
    const nextAccessToken =
      accessToken === undefined || accessToken === MASKED_SECRET
        ? container.settings.storage.accessToken
        : accessToken;
    const updated = {
      ...container.settings,
      storage: {
        ...container.settings.storage,
        baseUrl: baseUrl ?? container.settings.storage.baseUrl,
        accessToken: nextAccessToken
      }
    };
    await container.settingsLoader.save(updated);
    container.settings.storage = updated.storage;
    return reply.code(200).send({
      baseUrl: updated.storage.baseUrl,
      accessToken: redact(updated.storage.accessToken),
      hasAccessToken: !!updated.storage.accessToken
    });
  });
}

import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";

interface StorageSettingsBody {
  baseUrl?: string;
  accessToken?: string;
}

export async function registerStorageSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get("/api/settings/storage", async () => {
    const { baseUrl, accessToken } = container.settings.storage;
    return { baseUrl, accessToken };
  });

  app.post<{ Body: StorageSettingsBody }>("/api/settings/storage", async (request, reply) => {
    const { baseUrl, accessToken } = request.body ?? {};
    const updated = {
      ...container.settings,
      storage: {
        ...container.settings.storage,
        baseUrl: baseUrl ?? container.settings.storage.baseUrl,
        accessToken: accessToken ?? container.settings.storage.accessToken
      }
    };
    await container.settingsLoader.save(updated);
    container.settings.storage = updated.storage;
    return reply.code(200).send({ baseUrl: updated.storage.baseUrl, accessToken: updated.storage.accessToken });
  });
}

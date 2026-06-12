import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";

interface TtsSettingsBody {
  baseUrl?: string;
  apiKey?: string;
}

export async function registerTtsSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get("/api/settings/tts", async () => {
    const { baseUrl, apiKey } = container.settings.tts;
    return { baseUrl, apiKey };
  });

  app.post<{ Body: TtsSettingsBody }>("/api/settings/tts", async (request, reply) => {
    const { baseUrl, apiKey } = request.body ?? {};
    const updated = {
      ...container.settings,
      tts: {
        baseUrl: baseUrl ?? container.settings.tts.baseUrl,
        apiKey: apiKey ?? container.settings.tts.apiKey
      }
    };
    await container.settingsLoader.save(updated);
    container.settings.tts = updated.tts;
    return reply.code(200).send({ baseUrl: updated.tts.baseUrl, apiKey: updated.tts.apiKey });
  });
}

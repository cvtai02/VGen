import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { TtsSettingsResponseDto } from "../dtos/tts-settings-response.dto.js";
import type { UpdateTtsSettingsRequestDto } from "../dtos/update-tts-settings-request.dto.js";

const MASKED_SECRET = "********";

function redact(secret: string): string {
  return secret ? MASKED_SECRET : "";
}

export async function registerTtsSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: TtsSettingsResponseDto }>("/api/settings/tts", async () => {
    const { baseUrl, apiKey } = container.settings.tts;
    return { baseUrl, apiKey: redact(apiKey), hasApiKey: !!apiKey };
  });

  app.post<{ Body: UpdateTtsSettingsRequestDto; Reply: TtsSettingsResponseDto }>("/api/settings/tts", async (request, reply) => {
    const { baseUrl, apiKey } = request.body ?? {};
    const nextApiKey =
      apiKey === undefined || apiKey === MASKED_SECRET
        ? container.settings.tts.apiKey
        : apiKey;
    const updated = {
      ...container.settings,
      tts: {
        baseUrl: baseUrl ?? container.settings.tts.baseUrl,
        apiKey: nextApiKey
      }
    };
    await container.settingsLoader.save(updated);
    container.settings.tts = updated.tts;
    return reply.code(200).send({
      baseUrl: updated.tts.baseUrl,
      apiKey: redact(updated.tts.apiKey),
      hasApiKey: !!updated.tts.apiKey
    });
  });
}

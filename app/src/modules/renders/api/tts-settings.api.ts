import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { TtsSettingsResponseDto } from "../dtos/tts-settings-response.dto.js";
import type { UpdateTtsSettingsRequestDto } from "../dtos/update-tts-settings-request.dto.js";

const MASKED_SECRET = "********";

function redact(secret: string): string {
  return secret ? MASKED_SECRET : "";
}

async function meddlerFetch(baseUrl: string, apiKey: string, path: string): Promise<unknown> {
  const url = `${baseUrl.trim().replace(/\/+$/, "")}${path}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` }
  });
  if (!res.ok) throw new Error(`Meddler ${path} failed: ${res.status}`);
  return res.json();
}

export async function registerTtsSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: TtsSettingsResponseDto }>("/api/settings/tts", async () => {
    const { baseUrl, apiKey, provider, voiceModel } = container.settings.tts;
    return { baseUrl, apiKey: redact(apiKey), provider, voiceModel, hasApiKey: !!apiKey };
  });

  app.post<{ Body: UpdateTtsSettingsRequestDto; Reply: TtsSettingsResponseDto }>("/api/settings/tts", async (request, reply) => {
    const { baseUrl, apiKey, provider, voiceModel } = request.body ?? {};
    const nextApiKey =
      apiKey === undefined || apiKey === MASKED_SECRET
        ? container.settings.tts.apiKey
        : apiKey;
    const updated = {
      ...container.settings,
      tts: {
        baseUrl: baseUrl ?? container.settings.tts.baseUrl,
        apiKey: nextApiKey,
        provider: provider ?? container.settings.tts.provider,
        voiceModel: voiceModel ?? container.settings.tts.voiceModel
      }
    };
    await container.settingsLoader.save(updated);
    container.settings.tts = updated.tts;
    return reply.code(200).send({
      baseUrl: updated.tts.baseUrl,
      apiKey: redact(updated.tts.apiKey),
      provider: updated.tts.provider,
      voiceModel: updated.tts.voiceModel,
      hasApiKey: !!updated.tts.apiKey
    });
  });

  app.post("/api/settings/tts/test", async (_request, reply) => {
    const { baseUrl, apiKey } = container.settings.tts;
    if (!baseUrl.trim()) return reply.code(400).send({ ok: false, error: "Base URL is not configured." });
    if (!apiKey) return reply.code(400).send({ ok: false, error: "Access token is not configured." });
    try {
      await meddlerFetch(baseUrl, apiKey, "/api/tts/providers");
      return { ok: true };
    } catch (err) {
      return reply.code(502).send({ ok: false, error: err instanceof Error ? err.message : "Connection failed." });
    }
  });

  app.get("/api/tts/providers", async (_request, reply) => {
    const { baseUrl, apiKey } = container.settings.tts;
    if (!apiKey) return reply.code(400).send({ error: "TTS access token not configured" });
    return meddlerFetch(baseUrl, apiKey, "/api/tts/providers");
  });

  app.get<{ Querystring: { provider?: string } }>("/api/tts/voice-models", async (request, reply) => {
    const { baseUrl, apiKey } = container.settings.tts;
    if (!apiKey) return reply.code(400).send({ error: "TTS access token not configured" });
    const provider = request.query.provider;
    const path = provider ? `/api/tts/voice-models?provider=${encodeURIComponent(provider)}` : "/api/tts/voice-models";
    return meddlerFetch(baseUrl, apiKey, path);
  });
}

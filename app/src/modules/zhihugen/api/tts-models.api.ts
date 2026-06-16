import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { TtsModel } from "../store/zhihugen-store.js";

type IdParam = { Params: { id: string } };

export async function registerTtsModelsApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get("/api/tts/models", async () => {
    const data = await container.zhihugenStore.get();
    return { models: data.ttsModels, defaultModelId: data.defaultTtsModelId };
  });

  app.post<{ Body: TtsModel }>("/api/tts/models", async (request) => {
    const data = await container.zhihugenStore.get();
    const existing = data.ttsModels.findIndex((m) => m.id === request.body.id);
    if (existing >= 0) data.ttsModels[existing] = request.body;
    else data.ttsModels.push(request.body);
    await container.zhihugenStore.save(data);
    return request.body;
  });

  app.put<{ Body: { modelId: string } }>("/api/tts/models/default", async (request, reply) => {
    const data = await container.zhihugenStore.get();
    const model = data.ttsModels.find((m) => m.id === request.body.modelId);
    if (!model) return reply.code(404).send(apiError(404, "Not Found", "Model not found."));
    data.defaultTtsModelId = model.id;
    data.settings.defaultTtsModel = model.id;
    await container.zhihugenStore.save(data);
    return { defaultModelId: model.id };
  });

  app.delete<IdParam>("/api/tts/models/:id", async (request, reply) => {
    const data = await container.zhihugenStore.get();
    if (data.defaultTtsModelId === request.params.id) {
      return reply.code(409).send(apiError(409, "Conflict", "Cannot delete the default TTS model."));
    }
    data.ttsModels = data.ttsModels.filter((m) => m.id !== request.params.id);
    await container.zhihugenStore.save(data);
    return reply.code(204).send();
  });
}

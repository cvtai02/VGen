import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { ZhihugenSettings } from "../store/zhihugen-store.js";

export async function registerZhihugenSettingsApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get("/api/features/zhihugen/settings", async () => {
    const data = await container.zhihugenStore.get();
    return data.settings;
  });

  app.post<{ Body: Partial<ZhihugenSettings> }>("/api/features/zhihugen/settings", async (request) => {
    const data = await container.zhihugenStore.get();
    const updated = { ...data, settings: { ...data.settings, ...request.body } };
    await container.zhihugenStore.save(updated);
    return updated.settings;
  });
}

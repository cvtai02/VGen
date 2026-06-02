import { randomUUID } from "node:crypto";
import { SettingsLoader } from "./config/settings.loader.js";
import { SettingsWriter } from "./config/settings.writer.js";
import type { RuntimeSettings } from "./config/settings.schema.js";
import { prismaClient } from "./core/database/prisma-client.js";
import type { IdGenerator } from "./core/shared-kernel/contracts/id-generator.js";
import type { RenderJobQueue } from "./core/shared-kernel/contracts/render-job-queue.js";
import type { SettingsStore } from "./core/shared-kernel/contracts/settings-store.js";
import { BullmqRenderJobQueue } from "./infrastructure/queue/bullmq/bullmq-render-job-queue.js";
import { RemotionRenderEngine } from "./infrastructure/render-engine/remotion/remotion-render-engine.js";
import { MockStorageClient } from "./infrastructure/storage/mock/mock-storage-client.js";
import { ExecuteRenderJobUseCase } from "./modules/renders/usecases/execute-render-job.usecase.js";

export interface AppContainer {
  settings: RuntimeSettings;
  settingsStore: SettingsStore;
  prisma: typeof prismaClient;
  queue: RenderJobQueue;
  idGenerator: IdGenerator;
  executeRenderJobUseCase: ExecuteRenderJobUseCase;
}

export async function createContainer(): Promise<AppContainer> {
  const loader = new SettingsLoader();
  const writer = new SettingsWriter();
  const settings = await loader.load();
  const settingsStore: SettingsStore = {
    get: () => loader.load(),
    update: async (next) => {
      await writer.write(loader.getLocalSettingsPath(), next);
      return loader.load();
    }
  };
  const queue = new BullmqRenderJobQueue(settings.redis.url);
  const idGenerator: IdGenerator = { createId: () => randomUUID() };
  const renderEngine = new RemotionRenderEngine(settings.render.outputDirectory);
  const storage = new MockStorageClient();

  return {
    settings,
    settingsStore,
    prisma: prismaClient,
    queue,
    idGenerator,
    executeRenderJobUseCase: new ExecuteRenderJobUseCase(prismaClient, renderEngine, storage)
  };
}

import { randomUUID } from "node:crypto";
import { SettingsLoader } from "./config/settings.loader.js";
import type { RuntimeSettings } from "./config/settings.schema.js";
import { prismaClient } from "./core/database/prisma-client.js";
import type { IdGenerator } from "./core/shared-kernel/contracts/id-generator.js";
import { ConcurrencyLimiter } from "./infrastructure/concurrency/concurrency-limiter.js";
import { ZhihugenRenderEngine } from "./infrastructure/render-engine/zhihugen/zhihugen-render-engine.js";
import { SevenRouterStorageClient } from "./infrastructure/storage/7router/7router-storage-client.js";
import { ZhihugenStore } from "./modules/zhihugen/store/zhihugen-store.js";
import { ExecuteRenderJobUseCase } from "./modules/renders/usecases/execute-render-job.usecase.js";
import { ConfirmUploadRenderJobUseCase } from "./modules/renders/usecases/confirm-upload-render-job.usecase.js";
import { MarkRenderJobFailedUseCase } from "./modules/renders/usecases/mark-render-job-failed.usecase.js";

export interface AppContainer {
  settings: RuntimeSettings;
  settingsLoader: SettingsLoader;
  zhihugenStore: ZhihugenStore;
  prisma: typeof prismaClient;
  renderLimiter: ConcurrencyLimiter;
  idGenerator: IdGenerator;
  executeRenderJobUseCase: ExecuteRenderJobUseCase;
  confirmUploadRenderJobUseCase: ConfirmUploadRenderJobUseCase;
  markRenderJobFailedUseCase: MarkRenderJobFailedUseCase;
}

export async function createContainer(): Promise<AppContainer> {
  const systemSecret = process.env.SYSTEM_SECRET ?? "dev-secret";
  const settingsLoader = new SettingsLoader(prismaClient, systemSecret);
  const settings = await settingsLoader.load();

  const zhihugenStore = new ZhihugenStore(prismaClient);
  const idGenerator: IdGenerator = { createId: () => randomUUID() };
  const renderEngine = new ZhihugenRenderEngine(() => settings.tts);
  const storage = new SevenRouterStorageClient(() => settings.storage);

  return {
    settings,
    settingsLoader,
    zhihugenStore,
    prisma: prismaClient,
    renderLimiter: new ConcurrencyLimiter(3),
    idGenerator,
    executeRenderJobUseCase: new ExecuteRenderJobUseCase(prismaClient, renderEngine, storage),
    confirmUploadRenderJobUseCase: new ConfirmUploadRenderJobUseCase(prismaClient, storage),
    markRenderJobFailedUseCase: new MarkRenderJobFailedUseCase(prismaClient)
  };
}

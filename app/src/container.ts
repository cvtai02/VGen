import { randomUUID } from "node:crypto";
import { SettingsLoader } from "./config/settings.loader.js";
import type { RuntimeSettings } from "./config/settings.schema.js";
import { prismaClient } from "./core/database/prisma-client.js";
import type { IdGenerator } from "./core/shared-kernel/contracts/id-generator.js";
import { ConcurrencyLimiter } from "./infrastructure/concurrency/concurrency-limiter.js";
import { TelegramVideoDeliveryClient } from "./infrastructure/delivery/telegram/telegram-video-delivery-client.js";
import { ZhihugenRenderEngine } from "./infrastructure/render-engine/zhihugen/zhihugen-render-engine.js";
import { SevenRouterTempUploadStorageClient } from "./infrastructure/storage/7router/7router-temp-upload-storage-client.js";
import { ZhihugenStore } from "./modules/zhihugen/store/zhihugen-store.js";
import { ExecuteRenderJobUseCase } from "./modules/renders/usecases/execute-render-job.usecase.js";
import { ConfirmUploadRenderJobUseCase } from "./modules/renders/usecases/confirm-upload-render-job.usecase.js";
import { MarkRenderJobFailedUseCase } from "./modules/renders/usecases/mark-render-job-failed.usecase.js";
import { CreateAdminAccessTokenUseCase } from "./modules/auth/usecases/create-admin-access-token.usecase.js";
import { VerifyAdminAccessTokenUseCase } from "./modules/auth/usecases/verify-admin-access-token.usecase.js";
import type { VideoDeliveryClient } from "./core/shared-kernel/contracts/video-delivery-client.js";

export interface AppContainer {
  settings: RuntimeSettings;
  settingsLoader: SettingsLoader;
  zhihugenStore: ZhihugenStore;
  prisma: typeof prismaClient;
  renderLimiter: ConcurrencyLimiter;
  idGenerator: IdGenerator;
  videoDelivery: VideoDeliveryClient;
  createAdminAccessTokenUseCase: CreateAdminAccessTokenUseCase;
  verifyAdminAccessTokenUseCase: VerifyAdminAccessTokenUseCase;
  executeRenderJobUseCase: ExecuteRenderJobUseCase;
  confirmUploadRenderJobUseCase: ConfirmUploadRenderJobUseCase;
  markRenderJobFailedUseCase: MarkRenderJobFailedUseCase;
}

export async function createContainer(): Promise<AppContainer> {
  const systemSecret = process.env.SYSTEM_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!systemSecret) throw new Error("SYSTEM_SECRET must be set.");
  if (!encryptionKey) throw new Error("ENCRYPTION_KEY must be set.");

  const settingsLoader = new SettingsLoader(prismaClient, encryptionKey);
  const settings = await settingsLoader.load();

  const zhihugenStore = new ZhihugenStore(prismaClient);
  const idGenerator: IdGenerator = { createId: () => randomUUID() };
  const renderEngine = new ZhihugenRenderEngine(
    () => settings.tts,
    async () => (await zhihugenStore.get()).settings.defaultBackgroundMusicPath
  );
  const storage = new SevenRouterTempUploadStorageClient(() => settings.storage);
  const videoDelivery = new TelegramVideoDeliveryClient(() => settings.telegram);
  return {
    settings,
    settingsLoader,
    zhihugenStore,
    prisma: prismaClient,
    renderLimiter: new ConcurrencyLimiter(3),
    idGenerator,
    videoDelivery,
    createAdminAccessTokenUseCase: new CreateAdminAccessTokenUseCase(systemSecret, prismaClient),
    verifyAdminAccessTokenUseCase: new VerifyAdminAccessTokenUseCase(prismaClient, systemSecret),
    executeRenderJobUseCase: new ExecuteRenderJobUseCase(prismaClient, renderEngine, storage, videoDelivery),
    confirmUploadRenderJobUseCase: new ConfirmUploadRenderJobUseCase(prismaClient, storage, videoDelivery),
    markRenderJobFailedUseCase: new MarkRenderJobFailedUseCase(prismaClient)
  };
}

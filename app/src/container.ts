import { randomUUID } from "node:crypto";
import { SettingsLoader } from "./config/settings.loader.js";
import type { RuntimeSettings } from "./config/settings.schema.js";
import { prismaClient } from "./core/database/prisma-client.js";
import type { IdGenerator } from "./core/shared-kernel/contracts/id-generator.js";
import { ConcurrencyLimiter } from "./infrastructure/concurrency/concurrency-limiter.js";
import { TelegramVideoDeliveryClient } from "./infrastructure/delivery/telegram/telegram-video-delivery-client.js";
import { ZhihugenRenderEngine } from "./infrastructure/render-engine/zhihugen/zhihugen-render-engine.js";
import { LocalStorageClient } from "./infrastructure/storage/local/local-storage-client.js";
import { ZhihugenStore } from "./modules/zhihugen/store/zhihugen-store.js";
import { ExecuteRenderJobUseCase } from "./modules/renders/usecases/execute-render-job.usecase.js";
import { ConfirmUploadRenderJobUseCase } from "./modules/renders/usecases/confirm-upload-render-job.usecase.js";
import { MarkRenderJobFailedUseCase } from "./modules/renders/usecases/mark-render-job-failed.usecase.js";
import { CreateAdminAccessTokenUseCase } from "./modules/auth/usecases/create-admin-access-token.usecase.js";
import { VerifyAdminAccessTokenUseCase } from "./modules/auth/usecases/verify-admin-access-token.usecase.js";

export interface AppContainer {
  settings: RuntimeSettings;
  settingsLoader: SettingsLoader;
  zhihugenStore: ZhihugenStore;
  prisma: typeof prismaClient;
  renderLimiter: ConcurrencyLimiter;
  idGenerator: IdGenerator;
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
  const renderEngine = new ZhihugenRenderEngine(() => settings.tts);
  const storage = new LocalStorageClient();
  const videoDelivery = new TelegramVideoDeliveryClient(() => settings.telegram);
  const issuedAdminTokens = new Set<string>();

  return {
    settings,
    settingsLoader,
    zhihugenStore,
    prisma: prismaClient,
    renderLimiter: new ConcurrencyLimiter(3),
    idGenerator,
    createAdminAccessTokenUseCase: new CreateAdminAccessTokenUseCase(systemSecret, issuedAdminTokens),
    verifyAdminAccessTokenUseCase: new VerifyAdminAccessTokenUseCase(issuedAdminTokens, systemSecret),
    executeRenderJobUseCase: new ExecuteRenderJobUseCase(prismaClient, renderEngine, storage, videoDelivery),
    confirmUploadRenderJobUseCase: new ConfirmUploadRenderJobUseCase(prismaClient, storage, videoDelivery),
    markRenderJobFailedUseCase: new MarkRenderJobFailedUseCase(prismaClient)
  };
}

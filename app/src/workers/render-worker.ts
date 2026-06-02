import { createContainer } from "../container.js";
import { createBullmqRenderWorker } from "../infrastructure/queue/bullmq/bullmq-worker-factory.js";
import { MarkRenderJobFailedUseCase } from "../modules/renders/usecases/mark-render-job-failed.usecase.js";

const container = await createContainer();
const markFailed = new MarkRenderJobFailedUseCase(container.prisma);

createBullmqRenderWorker(container.settings.redis.url, async (payload) => {
  try {
    await container.executeRenderJobUseCase.execute(payload.renderJobId);
  } catch (error) {
    await markFailed.execute(payload.renderJobId, error);
    throw error;
  }
});

import { Worker } from "bullmq";
import type { RenderQueuePayload } from "../../../core/shared-kernel/contracts/render-job-queue.js";

export function createBullmqRenderWorker(redisUrl: string, processor: (payload: RenderQueuePayload) => Promise<void>) {
  return new Worker<RenderQueuePayload>(
    "render-jobs",
    async (job) => processor(job.data),
    { connection: { url: redisUrl } }
  );
}

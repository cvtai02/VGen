import { Queue } from "bullmq";
import type { RenderJobQueue, RenderQueuePayload } from "../../../core/shared-kernel/contracts/render-job-queue.js";

export class BullmqRenderJobQueue implements RenderJobQueue {
  private queue?: Queue<RenderQueuePayload>;

  constructor(private readonly redisUrl: string) {}

  async enqueue(payload: RenderQueuePayload): Promise<void> {
    await this.getQueue().add("render", payload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 10_000 }
    });
  }

  private getQueue(): Queue<RenderQueuePayload> {
    this.queue ??= new Queue<RenderQueuePayload>("render-jobs", { connection: { url: this.redisUrl } });
    return this.queue;
  }
}

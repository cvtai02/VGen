import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryOutcome } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import { basename } from "node:path";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

interface AwaitingUploadResult {
  localPath: string;
  destinationPath: string;
  label: string;
  title?: string;
  caption?: string;
  destinationIds?: string[];
}

export class ConfirmUploadRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly storage: StorageClient,
    private readonly videoDelivery: VideoDeliveryClient
  ) {}

  private async emitEvent(renderJobId: string, step: string, status: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.prisma.renderJobEvent.create({
      data: {
        id: randomUUID(),
        renderJobId,
        level: status,
        message: `${step}:${status}`,
        metadataJson: metadata ? JSON.stringify(metadata) : null
      }
    }).catch(() => {});
  }

  async execute(renderJobId: string): Promise<{ absolutePath: string; cdnUrl?: string }> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) throw new Error(`Render job not found: ${renderJobId}`);
    if (job.status !== RenderJobStatus.AwaitingUpload) throw new Error("Job is not awaiting upload.");

    const result = JSON.parse(job.resultJson!) as AwaitingUploadResult;

    await this.emitEvent(renderJobId, "upload", "started");
    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: result.localPath,
      destinationPath: result.destinationPath,
      contentType: "video/mp4"
    });
    await this.emitEvent(renderJobId, "upload", "completed", { absolutePath });

    await this.emitEvent(renderJobId, "telegram", "started");
    const telegram = await this.deliverToTelegram(result, absolutePath, cdnUrl);
    await this.emitEvent(renderJobId, "telegram", telegram?.some(t => t.status === "failed") ? "failed" : "completed");
    await unlink(result.localPath).catch(() => {});

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: result.label, telegram }),
        completedAt: new Date()
      }
    });

    return { absolutePath, cdnUrl };
  }

  private async deliverToTelegram(
    result: AwaitingUploadResult,
    absolutePath: string,
    cdnUrl?: string
  ): Promise<VideoDeliveryOutcome[] | null> {
    try {
      return await this.videoDelivery.deliverVideo({
        localPath: result.localPath,
        filename: basename(result.destinationPath),
        caption: this.buildCaption(result.title ?? result.label, result.caption ?? "", absolutePath),
        destinationIds: result.destinationIds
      });
    } catch (error) {
      return [
        this.toTelegramFailure(error)
      ];
    }
  }

  private toTelegramFailure(error: unknown): VideoDeliveryFailure {
    return {
      provider: "telegram",
      status: "failed",
      error: error instanceof Error ? error.message : "Telegram delivery failed.",
      failedAt: new Date().toISOString()
    };
  }

  private buildCaption(title: string, caption: string, absolutePath: string): string {
    return `/queue\n@7router: ${absolutePath}\n@title: ${title}\n@caption: ${caption}`;
  }
}

import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryOutcome } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import { basename } from "node:path";
import { unlink } from "node:fs/promises";

interface AwaitingUploadResult {
  localPath: string;
  destinationPath: string;
  label: string;
  telegramCaptionTemplate?: string;
}

export class ConfirmUploadRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly storage: StorageClient,
    private readonly videoDelivery: VideoDeliveryClient
  ) {}

  async execute(renderJobId: string): Promise<{ absolutePath: string; cdnUrl?: string }> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) throw new Error(`Render job not found: ${renderJobId}`);
    if (job.status !== RenderJobStatus.AwaitingUpload) throw new Error("Job is not awaiting upload.");

    const result = JSON.parse(job.resultJson!) as AwaitingUploadResult;

    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: result.localPath,
      destinationPath: result.destinationPath,
      contentType: "video/mp4"
    });

    const telegram = await this.deliverToTelegram(result, absolutePath, cdnUrl);
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
        caption: this.renderCaption(result.telegramCaptionTemplate, {
          label: result.label,
          absolutePath,
          cdnUrl: cdnUrl ?? ""
        })
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

  private renderCaption(template: string | undefined, values: Record<string, string>): string {
    const source = template?.trim() || "{label}\n\n{cdnUrl}";
    return source.replace(/\{(label|absolutePath|cdnUrl)\}/g, (_match, key: string) => values[key] ?? "");
  }
}

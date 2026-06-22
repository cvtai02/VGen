import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import { basename } from "node:path";
import { unlink } from "node:fs/promises";
import { emitJobEvent, deliverToTelegram } from "../../zhihugen/store/job-helpers.js";

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

  async execute(renderJobId: string): Promise<{ absolutePath: string; cdnUrl?: string }> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) throw new Error(`Render job not found: ${renderJobId}`);
    if (job.status !== RenderJobStatus.AwaitingUpload) throw new Error("Job is not awaiting upload.");

    const result = JSON.parse(job.resultJson!) as AwaitingUploadResult;

    await emitJobEvent(this.prisma, renderJobId, "upload", "started");
    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: result.localPath,
      destinationPath: result.destinationPath,
      contentType: "video/mp4"
    });
    await emitJobEvent(this.prisma, renderJobId, "upload", "completed", { absolutePath });

    await emitJobEvent(this.prisma, renderJobId, "telegram", "started");
    const telegram = await deliverToTelegram(this.videoDelivery, {
      localPath: result.localPath,
      filename: basename(result.destinationPath),
      title: result.title ?? result.label,
      caption: result.caption ?? "",
      absolutePath,
      destinationIds: result.destinationIds
    });
    await emitJobEvent(this.prisma, renderJobId, "telegram", telegram?.some(t => t.status === "failed") ? "failed" : "completed");
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
}

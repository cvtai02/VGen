import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { RenderEngine } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient, VideoDeliveryResult } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import type { ZhihugenJobRequest } from "../../zhihugen/store/job-helpers.js";

export class ExecuteRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly renderEngine: RenderEngine,
    private readonly storage: StorageClient,
    private readonly videoDelivery: VideoDeliveryClient
  ) {}

  async execute(renderJobId: string): Promise<{ absolutePath: string } | { awaitingUpload: true }> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) throw new Error(`Render job not found: ${renderJobId}`);

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: { status: RenderJobStatus.Rendering, startedAt: new Date() }
    });

    let req: ZhihugenJobRequest;
    try {
      req = JSON.parse(job.requestJson) as ZhihugenJobRequest;
    } catch {
      throw new Error(`Corrupt requestJson for job ${renderJobId}`);
    }

    // Download background video from 7router to a local tmp file
    const bgVideoLocalPath = join(tmpdir(), `bg_${randomUUID()}.mp4`);
    await this.storage.download(req.backgroundVideoPath, bgVideoLocalPath);

    const destinationPath = `${req.outputDirectory.replace(/\/+$/, "")}/${req.outputFilename}`;

    let output;
    try {
      output = await this.renderEngine.render({
        renderJobId,
        type: job.type,
        request: { ...req, backgroundVideoLocalPath: bgVideoLocalPath }
      });
    } finally {
      await unlink(bgVideoLocalPath).catch(() => {});
    }

    if (req.previewBeforeUpload) {
      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: RenderJobStatus.AwaitingUpload,
          resultJson: JSON.stringify({ localPath: output.localPath, destinationPath, label: req.label, telegramCaptionTemplate: req.telegramCaptionTemplate })
        }
      });
      return { awaitingUpload: true };
    }

    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: output.localPath,
      destinationPath,
      contentType: "video/mp4"
    });

    const telegram = await this.deliverToTelegram(output.localPath, req.outputFilename, req, absolutePath, cdnUrl);

    await unlink(output.localPath).catch(() => {});

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: req.label, telegram }),
        completedAt: new Date()
      }
    });

    return { absolutePath };
  }

  private async deliverToTelegram(
    localPath: string,
    filename: string,
    req: ZhihugenJobRequest,
    absolutePath: string,
    cdnUrl?: string
  ): Promise<VideoDeliveryResult | { provider: "telegram"; status: "failed"; error: string; failedAt: string } | null> {
    try {
      return await this.videoDelivery.deliverVideo({
        localPath,
        filename,
        caption: this.renderCaption(req.telegramCaptionTemplate, {
          label: req.label,
          absolutePath,
          cdnUrl: cdnUrl ?? ""
        })
      });
    } catch (error) {
      return {
        provider: "telegram",
        status: "failed",
        error: error instanceof Error ? error.message : "Telegram delivery failed.",
        failedAt: new Date().toISOString()
      };
    }
  }

  private renderCaption(template: string | undefined, values: Record<string, string>): string {
    const source = template?.trim() || "{label}\n\n{cdnUrl}";
    return source.replace(/\{(label|absolutePath|cdnUrl)\}/g, (_match, key: string) => values[key] ?? "");
  }
}

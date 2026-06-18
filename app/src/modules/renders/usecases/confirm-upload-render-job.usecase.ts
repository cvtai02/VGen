import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryOutcome } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import { basename } from "node:path";
import { unlink } from "node:fs/promises";

const SIXGATE_BASE_URL = process.env.SIXGATE_BASE_URL || "http://localhost:20130";

interface AwaitingUploadResult {
  localPath: string;
  destinationPath: string;
  label: string;
  caption?: string;
  telegramCaptionTemplate?: string;
  destinationIds?: string[];
  sixgateGroupId?: string;
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
    const sixgate = await this.enqueueToSixGate(result.sixgateGroupId, result.label, absolutePath, result.caption, cdnUrl);
    await unlink(result.localPath).catch(() => {});

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: result.label, telegram, sixgate }),
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
        }),
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

  private async enqueueToSixGate(
    groupId: string | undefined,
    label: string,
    absolutePath: string,
    caption?: string,
    cdnUrl?: string
  ): Promise<{ queued: boolean; error?: string }> {
    if (!groupId) return { queued: false, error: "No 6Gate group selected" };
    try {
      const body: Record<string, string> = { title: label };
      if (caption) body.caption = caption;
      if (cdnUrl) {
        body.videoUrl = cdnUrl;
      } else {
        body.absolutePath = absolutePath;
      }
      const res = await fetch(`${SIXGATE_BASE_URL}/api/groups/${groupId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
        console.error(`[6Gate] Enqueue failed: ${msg}`);
        return { queued: false, error: msg };
      }
      console.log(`[6Gate] Enqueued "${label}" to group ${groupId}`);
      return { queued: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[6Gate] Enqueue error: ${msg}`);
      return { queued: false, error: msg };
    }
  }

  private renderCaption(template: string | undefined, values: Record<string, string>): string {
    const source = template?.trim() || "{label}\n\n{cdnUrl}";
    return source.replace(/\{(label|absolutePath|cdnUrl)\}/g, (_match, key: string) => values[key] ?? "");
  }
}

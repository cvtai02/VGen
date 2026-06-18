import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { RenderEngine } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryOutcome } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import type { ZhihugenJobRequest } from "../../zhihugen/store/job-helpers.js";

const SIXGATE_BASE_URL = process.env.SIXGATE_BASE_URL || "http://localhost:20130";

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

    // Download background video to a local tmp file
    const bgVideoLocalPath = join(tmpdir(), `bg_${randomUUID()}.mp4`);
    if (/^https?:\/\//i.test(req.backgroundVideoPath)) {
      await downloadUrl(req.backgroundVideoPath, bgVideoLocalPath);
    } else {
      await this.storage.download(req.backgroundVideoPath, bgVideoLocalPath);
    }

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
          resultJson: JSON.stringify({ localPath: output.localPath, destinationPath, label: req.label, caption: req.caption, telegramCaptionTemplate: req.telegramCaptionTemplate, destinationIds: req.destinationIds, sixgateGroupId: req.sixgateGroupId })
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

    const sixgate = await this.enqueueToSixGate(req.sixgateGroupId, req.label, absolutePath, req.caption, cdnUrl);

    await unlink(output.localPath).catch(() => {});

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: req.label, telegram, sixgate }),
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
  ): Promise<VideoDeliveryOutcome[] | null> {
    try {
      return await this.videoDelivery.deliverVideo({
        localPath,
        filename,
        caption: this.renderCaption(req.telegramCaptionTemplate, {
          label: req.label,
          absolutePath,
          cdnUrl: cdnUrl ?? ""
        }),
        destinationIds: req.destinationIds
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

async function downloadUrl(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  if (!res.body) throw new Error(`Empty response body: ${url}`);
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
}

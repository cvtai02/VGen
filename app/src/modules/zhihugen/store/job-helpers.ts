import { randomInt, randomUUID } from "node:crypto";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryOutcome } from "../../../core/shared-kernel/contracts/video-delivery-client.js";

function timestampSlug(): { date: string; time: string; rand: string } {
  const d = new Date().toISOString();
  return {
    date: d.slice(0, 10).replace(/-/g, ""),
    time: d.slice(11, 19).replace(/:/g, ""),
    rand: randomInt(1_000_000).toString().padStart(6, "0")
  };
}

export function generateJobId(): string {
  const { date, time, rand } = timestampSlug();
  return `job_${date}_${time}_${rand}`;
}

export function generateOutputFilename(): string {
  const { date, time, rand } = timestampSlug();
  return `${date}_${time}_${rand}.mp4`;
}

export function toZhihugenStatus(dbStatus: string): "pending" | "awaiting_upload" | "completed" | "failed" {
  if (dbStatus === RenderJobStatus.Completed) return "completed";
  if (dbStatus === RenderJobStatus.AwaitingUpload) return "awaiting_upload";
  if (dbStatus === RenderJobStatus.Failed || dbStatus === RenderJobStatus.Cancelled) return "failed";
  return "pending";
}

export interface TextBlock {
  text: string;
  author?: string;
}

export interface ZhihugenJobRequest {
  blocks: TextBlock[];
  images: string[];
  scripts: string[];
  title: string;
  caption: string;
  label: string;
  outputFilename: string;
  outputDirectory: string;
  backgroundVideoPath: string;
  ttsModel: string;
  resolution: string;
  fps: number;
  imageFit: "contain" | "cover";
  sceneCount: number;
  previewBeforeUpload?: boolean;
  backgroundVideoLocalPath?: string;
  destinationIds?: string[];
}

export interface ZhihugenJobResult {
  absolutePath?: string;
  cdnUrl?: string;
  localPath?: string;
  label: string;
  telegram?: Array<{
    provider: "telegram";
    status: "sent" | "failed";
    botId?: string;
    botName?: string;
    destinationId?: string;
    destinationName?: string;
    chatId?: string;
    messageId?: number;
    fileId?: string;
    link?: string;
    sentAt?: string;
    error?: string;
    failedAt?: string;
  }> | null;
}

export function buildTelegramCaption(title: string, caption: string, absolutePath: string): string {
  return `/queue\n@7router: ${absolutePath}\n@title: ${title}\n@caption: ${caption}`;
}

export function toTelegramFailure(error: unknown): VideoDeliveryFailure {
  return {
    provider: "telegram",
    status: "failed",
    error: error instanceof Error ? error.message : "Telegram delivery failed.",
    failedAt: new Date().toISOString()
  };
}

export async function deliverToTelegram(
  videoDelivery: VideoDeliveryClient,
  input: { localPath: string; filename: string; title: string; caption: string; absolutePath: string; destinationIds?: string[] }
): Promise<VideoDeliveryOutcome[] | null> {
  try {
    return await videoDelivery.deliverVideo({
      localPath: input.localPath,
      filename: input.filename,
      caption: buildTelegramCaption(input.title, input.caption, input.absolutePath),
      destinationIds: input.destinationIds
    });
  } catch (error) {
    return [toTelegramFailure(error)];
  }
}

export async function emitJobEvent(
  prisma: PrismaContext,
  renderJobId: string,
  step: string,
  status: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.renderJobEvent.create({
    data: {
      id: randomUUID(),
      renderJobId,
      level: status,
      message: `${step}:${status}`,
      metadataJson: metadata ? JSON.stringify(metadata) : null
    }
  }).catch(() => {});
}

function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

export function formatJobResponse(job: {
  id: string;
  status: string;
  requestJson: string;
  resultJson: string | null;
  errorMessage: string | null;
}) {
  const req = safeJsonParse<ZhihugenJobRequest>(job.requestJson);
  const result = safeJsonParse<ZhihugenJobResult>(job.resultJson);
  const status = toZhihugenStatus(job.status);
  const base = { jobId: job.id, status, label: req?.label ?? "Unknown" };

  if (status === "completed") return { ...base, absolutePath: result?.absolutePath, cdnUrl: result?.cdnUrl, telegram: result?.telegram };
  if (status === "failed") return { ...base, error: job.errorMessage ?? "Unknown error" };
  return base;
}

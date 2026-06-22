import { homedir } from "node:os";
import { join, extname } from "node:path";
import { createWriteStream } from "node:fs";
import { mkdir, stat, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { RenderEngine, RenderProgressStep } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { VideoDeliveryClient } from "../../../core/shared-kernel/contracts/video-delivery-client.js";
import { emitJobEvent, deliverToTelegram, type ZhihugenJobRequest } from "../../zhihugen/store/job-helpers.js";

const CACHE_DIR = join(homedir(), ".vgen", "resource-cache");

function cacheKey(sourcePath: string): string {
  return createHash("sha256").update(sourcePath).digest("hex").slice(0, 16);
}

function cachePath(sourcePath: string): string {
  const ext = extname(sourcePath) || ".mp4";
  return join(CACHE_DIR, `${cacheKey(sourcePath)}${ext}`);
}

async function fileExists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

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

    // Start background video download in parallel with TTS (cached)
    await emitJobEvent(this.prisma, renderJobId, "download_resources", "started");
    const bgVideoReady = (async () => {
      await mkdir(CACHE_DIR, { recursive: true });
      const cached = cachePath(req.backgroundVideoPath);
      const cacheHit = await fileExists(cached);
      if (!cacheHit) {
        await downloadUrl(req.backgroundVideoPath, cached);
      }
      await emitJobEvent(this.prisma, renderJobId, "download_resources", "completed", { cacheHit });
      return cached;
    })();

    const destinationPath = `${req.outputDirectory.replace(/\/+$/, "")}/${req.outputFilename}`;

    const onProgress = (step: RenderProgressStep, status: "started" | "completed") => {
      void emitJobEvent(this.prisma, renderJobId, step, status);
    };

    let output;
    try {
      output = await this.renderEngine.render({
        renderJobId,
        type: job.type,
        request: req,
        onProgress,
        bgVideoReady
      });
    } finally {
      await bgVideoReady.catch(() => {});
    }

    if (req.previewBeforeUpload) {
      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: RenderJobStatus.AwaitingUpload,
          resultJson: JSON.stringify({ localPath: output.localPath, destinationPath, label: req.label, title: req.title, caption: req.caption, destinationIds: req.destinationIds })
        }
      });
      return { awaitingUpload: true };
    }

    await emitJobEvent(this.prisma, renderJobId, "upload", "started");
    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: output.localPath,
      destinationPath,
      contentType: "video/mp4"
    });
    await emitJobEvent(this.prisma, renderJobId, "upload", "completed");

    await emitJobEvent(this.prisma, renderJobId, "telegram", "started");
    const telegram = await deliverToTelegram(this.videoDelivery, {
      localPath: output.localPath,
      filename: req.outputFilename,
      title: req.title ?? req.label,
      caption: req.caption ?? "",
      absolutePath,
      destinationIds: req.destinationIds
    });
    await emitJobEvent(this.prisma, renderJobId, "telegram", telegram?.some(t => t.status === "failed") ? "failed" : "completed");

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

}

async function downloadUrl(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  if (!res.body) throw new Error(`Empty response body: ${url}`);
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest));
}

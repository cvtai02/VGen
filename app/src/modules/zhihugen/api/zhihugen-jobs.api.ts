import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { basename } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import { RenderJobType } from "../../../core/shared-kernel/enums/render-job-type.js";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { AppContainer } from "../../../container.js";
import { formatJobResponse, toZhihugenStatus, type ZhihugenJobRequest, type ZhihugenJobResult } from "../store/job-helpers.js";

type IdParam = { Params: { id: string } };

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function registerZhihugenJobsApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  // GET /api/zhihugen/jobs
  app.get("/api/zhihugen/jobs", async () => {
    const jobs = await container.prisma.renderJob.findMany({
      where: { type: RenderJobType.Zhihugen },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return jobs.map((job) => formatJobResponse(job));
  });

  // GET /api/zhihugen/jobs/:id
  app.get<IdParam>("/api/zhihugen/jobs/:id", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
    return formatJobResponse(job);
  });

  // GET /api/zhihugen/jobs/:id/wait  — long-poll until completed/failed (max 5 min)
  app.get<IdParam>("/api/zhihugen/jobs/:id/wait", async (request: FastifyRequest<IdParam>, reply) => {
    const deadline = Date.now() + 5 * 60 * 1000;
    const { id } = request.params;
    let aborted = false;
    request.raw.on("close", () => { aborted = true; });

    while (Date.now() < deadline && !aborted) {
      const job = await container.prisma.renderJob.findUnique({ where: { id } });
      if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
      const status = toZhihugenStatus(job.status);
      if (status === "completed" || status === "failed" || status === "awaiting_upload") return formatJobResponse(job);
      await sleep(3_000);
    }

    if (aborted) return;
    return reply.code(408).send(apiError(408, "Request Timeout", "Job did not complete in time. Poll the job status endpoint instead."));
  });

  // GET /api/zhihugen/jobs/:id/preview  — stream locally rendered video for preview
  app.get<IdParam>("/api/zhihugen/jobs/:id/preview", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
    if (job.status !== RenderJobStatus.AwaitingUpload)
      return reply.code(409).send(apiError(409, "Conflict", "Preview is only available for jobs awaiting upload."));

    const result = JSON.parse(job.resultJson!) as { localPath: string };
    const fileStat = await stat(result.localPath);
    const fileSize = fileStat.size;
    const rangeHeader = request.headers.range;

    if (rangeHeader) {
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      if (isNaN(start) || start < 0 || start >= fileSize || end < start || end >= fileSize) {
        return reply.code(416).send(apiError(416, "Range Not Satisfiable", `Valid range: 0-${fileSize - 1}`));
      }
      const chunkSize = end - start + 1;
      reply
        .code(206)
        .header("Content-Range", `bytes ${start}-${end}/${fileSize}`)
        .header("Accept-Ranges", "bytes")
        .header("Content-Length", String(chunkSize))
        .header("Content-Type", "video/mp4");
      return reply.send(createReadStream(result.localPath, { start, end }));
    }

    reply
      .header("Content-Length", String(fileSize))
      .header("Content-Type", "video/mp4")
      .header("Accept-Ranges", "bytes");
    return reply.send(createReadStream(result.localPath));
  });

  // POST /api/zhihugen/jobs/:id/confirm-upload  — upload the previewed video to storage
  app.post<IdParam>("/api/zhihugen/jobs/:id/confirm-upload", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
    if (job.status !== RenderJobStatus.AwaitingUpload)
      return reply.code(409).send(apiError(409, "Conflict", "Job is not awaiting upload."));

    try {
      const { absolutePath, cdnUrl } = await container.confirmUploadRenderJobUseCase.execute(request.params.id);
      return { absolutePath, cdnUrl };
    } catch (error) {
      await container.markRenderJobFailedUseCase.execute(request.params.id, error).catch(() => {});
      return reply.code(500).send(apiError(500, "Internal Server Error", error instanceof Error ? error.message : "Upload failed."));
    }
  });

  // POST /api/zhihugen/jobs/:id/cancel  — cancel a pending or awaiting-upload job
  app.post<IdParam>("/api/zhihugen/jobs/:id/cancel", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));

    const cancellable = [RenderJobStatus.Pending, RenderJobStatus.AwaitingUpload];
    if (!cancellable.includes(job.status as RenderJobStatus))
      return reply.code(409).send(apiError(409, "Conflict", `Cannot cancel a job with status "${job.status}".`));

    const result = job.resultJson ? (JSON.parse(job.resultJson) as { localPath?: string }) : null;
    if (result?.localPath) await unlink(result.localPath).catch(() => {});

    await container.prisma.renderJob.update({
      where: { id: request.params.id },
      data: { status: RenderJobStatus.Cancelled }
    });

    return { status: "cancelled" };
  });

  // POST /api/zhihugen/jobs/:id/discard  — discard the previewed video without uploading
  app.post<IdParam>("/api/zhihugen/jobs/:id/discard", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
    if (job.status !== RenderJobStatus.AwaitingUpload)
      return reply.code(409).send(apiError(409, "Conflict", "Job is not awaiting upload."));

    const result = job.resultJson ? (JSON.parse(job.resultJson) as { localPath?: string }) : null;
    if (result?.localPath) await unlink(result.localPath).catch(() => {});

    await container.prisma.renderJob.update({
      where: { id: request.params.id },
      data: { status: RenderJobStatus.Cancelled }
    });

    return { status: "discarded" };
  });

  // GET /api/zhihugen/jobs/:id/events
  app.get<IdParam>("/api/zhihugen/jobs/:id/events", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));

    const events = await container.prisma.renderJobEvent.findMany({
      where: { renderJobId: request.params.id },
      orderBy: { createdAt: "asc" }
    });

    return events.map((e) => {
      let metadata: Record<string, unknown> | undefined;
      if (e.metadataJson) try { metadata = JSON.parse(e.metadataJson); } catch {}
      return {
        id: e.id,
        step: e.message.split(":")[0],
        status: e.message.split(":")[1] ?? e.level,
        metadata,
        createdAt: e.createdAt.toISOString()
      };
    });
  });

  // POST /api/zhihugen/jobs/:id/resend  — resend completed video to Telegram
  app.post<IdParam>("/api/zhihugen/jobs/:id/resend", async (request, reply) => {
    const job = await container.prisma.renderJob.findUnique({ where: { id: request.params.id } });
    if (!job) return reply.code(404).send(apiError(404, "Not Found", "Job not found."));
    if (job.status !== RenderJobStatus.Completed)
      return reply.code(409).send(apiError(409, "Conflict", "Only completed jobs can be resent."));

    const result = JSON.parse(job.resultJson!) as ZhihugenJobResult;
    if (!result.absolutePath)
      return reply.code(409).send(apiError(409, "Conflict", "Job has no output file path."));

    await stat(result.absolutePath).catch(() => {
      throw new Error("Output file no longer exists on disk.");
    });

    const req = JSON.parse(job.requestJson) as ZhihugenJobRequest;
    const caption = `/queue\n@title: ${req.title}\n@caption: ${req.caption}`;

    const telegram = await container.videoDelivery.deliverVideo({
      localPath: result.absolutePath,
      filename: basename(result.absolutePath),
      caption,
      destinationIds: req.destinationIds
    });

    await container.prisma.renderJob.update({
      where: { id: job.id },
      data: {
        resultJson: JSON.stringify({ ...result, telegram })
      }
    });

    return formatJobResponse({
      ...job,
      resultJson: JSON.stringify({ ...result, telegram })
    });
  });
}

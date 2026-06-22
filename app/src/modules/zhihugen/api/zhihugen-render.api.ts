import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import { RenderJobType } from "../../../core/shared-kernel/enums/render-job-type.js";
import type { AppContainer } from "../../../container.js";
import { emitJobEvent, generateJobId, generateOutputFilename, type TextBlock, type ZhihugenJobRequest } from "../store/job-helpers.js";
import { renderTextBlocksToImages } from "../../../infrastructure/render-engine/zhihugen/text-to-threads-images.js";

interface RenderRequestBody {
  blocks: TextBlock[];
  title: string;
  caption?: string;
  telegramDestinations?: string[];
  previewBeforeUpload?: boolean;
}

async function createAndRender(container: AppContainer, req: ZhihugenJobRequest, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  if (container.renderLimiter.isFull) {
    return reply.code(429).send(apiError(429, "Too Many Requests", "Too many renders in progress. Try again later."));
  }

  const id = generateJobId();
  await container.prisma.renderJob.create({
    data: {
      id,
      type: RenderJobType.Zhihugen,
      status: RenderJobStatus.Pending,
      requestJson: JSON.stringify(req)
    }
  });

  await emitJobEvent(container.prisma, id, "images_generation", "completed");

  try {
    const result = await container.renderLimiter.run(() =>
      container.executeRenderJobUseCase.execute(id)
    );
    if ("awaitingUpload" in result) {
      return reply.code(202).send({ jobId: id, status: "awaiting_upload" });
    }
    return { absolutePath: result.absolutePath };
  } catch (error) {
    await container.markRenderJobFailedUseCase.execute(id, error).catch(() => {});
    return reply.code(500).send(apiError(500, "Internal Server Error", error instanceof Error ? error.message : "Render failed."));
  }
}

export async function registerZhihugenRenderApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Body: RenderRequestBody }>("/api/zhihugen/render", async (request, reply) => {
    const { blocks, title, caption, telegramDestinations, previewBeforeUpload } = request.body ?? {};

    if (!blocks?.length) {
      return reply.code(400).send(apiError(400, "Bad Request", "At least one text block is required."));
    }
    if (!title?.trim()) {
      return reply.code(400).send(apiError(400, "Bad Request", "Title is required."));
    }

    const store = await container.zhihugenStore.get();
    const tmpDir = join(tmpdir(), `zhihugen-${randomUUID()}`);

    try {
      await mkdir(tmpDir, { recursive: true });
      const imagePaths = await renderTextBlocksToImages(blocks, tmpDir);
      const scripts = blocks.map((b) => b.text);

      const req: ZhihugenJobRequest = {
        blocks,
        images: imagePaths,
        scripts,
        title: title.trim(),
        caption: caption?.trim() ?? "",
        label: title.trim(),
        outputFilename: generateOutputFilename(),
        outputDirectory: store.settings.defaultOutputDirectory,
        backgroundVideoPath: store.settings.defaultBackgroundVideoPath,
        ttsModel: store.settings.defaultTtsModel,
        resolution: store.settings.defaultResolution,
        fps: store.settings.defaultFps,
        imageFit: store.settings.defaultImageFit,
        sceneCount: blocks.length,
        previewBeforeUpload: previewBeforeUpload ?? false,
        destinationIds: telegramDestinations?.length ? telegramDestinations : undefined
      };

      return await createAndRender(container, req, reply);
    } catch (err) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      throw err;
    }
  });
}

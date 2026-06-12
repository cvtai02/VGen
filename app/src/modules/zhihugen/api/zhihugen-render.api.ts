import multipart from "@fastify/multipart";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import { RenderJobType } from "../../../core/shared-kernel/enums/render-job-type.js";
import type { AppContainer } from "../../../container.js";
import { generateJobId, generateOutputFilename, type ZhihugenJobRequest } from "../store/job-helpers.js";

async function createAndRender(container: AppContainer, req: ZhihugenJobRequest, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) {
  if (container.renderLimiter.isFull) {
    return reply.code(429).send({ message: "Too many renders in progress. Try again later." });
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
    return reply.code(500).send({ message: error instanceof Error ? error.message : "Render failed." });
  }
}

// POST /api/zhihugen/render  — multipart: images (files) + scripts + label
export async function registerZhihugenRenderApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024, files: 50 } });

  app.post("/api/zhihugen/render", async (request, reply) => {
    const store = await container.zhihugenStore.get();
    const tmpDir = join(tmpdir(), `zhihugen-${randomUUID()}`);

    const imagePaths: string[] = [];
    const scripts: string[] = [];
    let label = "";
    let previewBeforeUpload = false;

    await mkdir(tmpDir, { recursive: true });
    for await (const part of request.parts()) {
      if (part.type === "file" && part.fieldname === "images") {
        const buf = await part.toBuffer();
        const dest = join(tmpDir, `${imagePaths.length}_${part.filename ?? "image"}`);
        await writeFile(dest, buf);
        imagePaths.push(dest);
      } else if (part.type === "field") {
        const val = part.value as string;
        if (part.fieldname === "scripts") scripts.push(val);
        else if (part.fieldname === "label") label = val;
        else if (part.fieldname === "previewBeforeUpload") previewBeforeUpload = val === "true";
      }
    }

    if (imagePaths.length === 0) return reply.code(400).send({ message: "No images provided." });
    if (!label.trim()) return reply.code(400).send({ message: "Label is required." });

    const req: ZhihugenJobRequest = {
      images: imagePaths,
      scripts,
      label,
      outputFilename: generateOutputFilename(),
      outputDirectory: store.settings.defaultOutputDirectory,
      backgroundVideoPath: store.settings.defaultBackgroundVideoPath,
      ttsModel: store.settings.defaultTtsModel,
      resolution: store.settings.defaultResolution,
      fps: store.settings.defaultFps,
      imageFit: store.settings.defaultImageFit,
      sceneCount: imagePaths.length,
      previewBeforeUpload
    };

    return createAndRender(container, req, reply);
  });
}

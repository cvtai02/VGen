import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { RenderEngine } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";
import type { ZhihugenJobRequest } from "../../zhihugen/store/job-helpers.js";

export class ExecuteRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly renderEngine: RenderEngine,
    private readonly storage: StorageClient
  ) {}

  async execute(renderJobId: string): Promise<{ absolutePath: string } | { awaitingUpload: true }> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) throw new Error(`Render job not found: ${renderJobId}`);

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: { status: RenderJobStatus.Rendering, startedAt: new Date() }
    });

    const req = JSON.parse(job.requestJson) as ZhihugenJobRequest;

    // Download background video from 7router to a local tmp file
    const bgVideoLocalPath = join(tmpdir(), `bg_${randomUUID()}.mp4`);
    await this.storage.download(req.backgroundVideoPath, bgVideoLocalPath);

    const destinationPath = `${req.outputDirectory.replace(/\/+$/, "")}/${req.outputFilename}`;

    const output = await this.renderEngine.render({
      renderJobId,
      type: job.type,
      request: { ...req, backgroundVideoLocalPath: bgVideoLocalPath }
    });

    if (req.previewBeforeUpload) {
      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: {
          status: RenderJobStatus.AwaitingUpload,
          resultJson: JSON.stringify({ localPath: output.localPath, destinationPath, label: req.label })
        }
      });
      return { awaitingUpload: true };
    }

    const { absolutePath, cdnUrl } = await this.storage.upload({
      localPath: output.localPath,
      destinationPath,
      contentType: "video/mp4"
    });

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: req.label }),
        completedAt: new Date()
      }
    });

    return { absolutePath };
  }
}

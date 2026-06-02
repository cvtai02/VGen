import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { RenderEngine } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";

export class ExecuteRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly renderEngine: RenderEngine,
    private readonly storage: StorageClient
  ) {}

  async execute(renderJobId: string): Promise<void> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: renderJobId } });
    if (!job) {
      throw new Error(`Render job not found: ${renderJobId}`);
    }

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: { status: RenderJobStatus.Rendering, startedAt: new Date() }
    });

    const output = await this.renderEngine.render({
      renderJobId,
      type: job.type,
      request: job.requestJson
    });
    const upload = await this.storage.upload({ localPath: output.localPath, contentType: "video/mp4" });

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: { ...output, url: upload.url },
        completedAt: new Date()
      }
    });
  }
}

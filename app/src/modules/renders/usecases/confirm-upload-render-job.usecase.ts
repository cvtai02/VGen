import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { StorageClient } from "../../../core/shared-kernel/contracts/storage-client.js";

interface AwaitingUploadResult {
  localPath: string;
  destinationPath: string;
  label: string;
}

export class ConfirmUploadRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly storage: StorageClient
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

    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Completed,
        resultJson: JSON.stringify({ absolutePath, cdnUrl, label: result.label }),
        completedAt: new Date()
      }
    });

    return { absolutePath, cdnUrl };
  }
}

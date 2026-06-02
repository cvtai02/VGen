import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import type { PrismaContext } from "../../../core/database/prisma-context.js";

export class MarkRenderJobFailedUseCase {
  constructor(private readonly prisma: PrismaContext) {}

  async execute(renderJobId: string, error: unknown): Promise<void> {
    await this.prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: RenderJobStatus.Failed,
        errorMessage: error instanceof Error ? error.message : String(error),
        failedAt: new Date()
      }
    });
  }
}

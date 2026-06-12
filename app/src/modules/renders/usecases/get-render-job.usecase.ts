import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { GetRenderJobRequestDto } from "../dtos/get-render-job-request.dto.js";
import type { RenderJobResultDto } from "../dtos/render-job-result.dto.js";

export class GetRenderJobUseCase {
  constructor(private readonly prisma: PrismaContext) {}

  async execute(request: GetRenderJobRequestDto): Promise<RenderJobResultDto | null> {
    const job = await this.prisma.renderJob.findUnique({ where: { id: request.renderJobId } });
    if (!job) return null;
    return {
      id: job.id,
      type: job.type as RenderJobResultDto["type"],
      status: job.status as RenderJobResultDto["status"],
      output: job.resultJson ? (JSON.parse(job.resultJson) as RenderJobResultDto["output"]) : undefined,
      error: job.errorMessage ? { message: job.errorMessage } : undefined,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };
  }
}

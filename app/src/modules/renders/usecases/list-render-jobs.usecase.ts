import type { Prisma } from "@prisma/client";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { ListRenderJobsRequestDto } from "../dtos/list-render-jobs-request.dto.js";
import type { RenderJobResultDto } from "../dtos/render-job-result.dto.js";

export class ListRenderJobsUseCase {
  constructor(private readonly prisma: PrismaContext) {}

  async execute(request: ListRenderJobsRequestDto): Promise<RenderJobResultDto[]> {
    const where: Prisma.RenderJobWhereInput = {
      status: request.status,
      type: request.type
    };
    const jobs = await this.prisma.renderJob.findMany({
      where,
      take: request.limit ?? 25,
      skip: request.cursor ? 1 : 0,
      cursor: request.cursor ? { id: request.cursor } : undefined,
      orderBy: { createdAt: "desc" }
    });

    return jobs.map((job) => ({
      id: job.id,
      type: job.type as RenderJobResultDto["type"],
      status: job.status as RenderJobResultDto["status"],
      output: job.resultJson as unknown as RenderJobResultDto["output"] | undefined,
      error: job.errorMessage ? { message: job.errorMessage } : undefined,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    }));
  }
}

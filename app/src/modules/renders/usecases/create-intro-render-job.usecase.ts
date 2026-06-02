import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import { RenderJobType } from "../../../core/shared-kernel/enums/render-job-type.js";
import type { Prisma } from "@prisma/client";
import type { PrismaContext } from "../../../core/database/prisma-context.js";
import type { IdGenerator } from "../../../core/shared-kernel/contracts/id-generator.js";
import type { RenderJobQueue } from "../../../core/shared-kernel/contracts/render-job-queue.js";
import type { CreateIntroRenderJobRequestDto } from "../dtos/create-intro-render-job-request.dto.js";
import type { CreateRenderJobResponseDto } from "../dtos/create-render-job-response.dto.js";

export class CreateIntroRenderJobUseCase {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly queue: RenderJobQueue,
    private readonly idGenerator: IdGenerator,
    private readonly baseUrl: string
  ) {}

  async execute(request: CreateIntroRenderJobRequestDto): Promise<CreateRenderJobResponseDto> {
    const id = this.idGenerator.createId();
    await this.prisma.renderJob.create({
      data: {
        id,
        type: RenderJobType.Intro,
        status: RenderJobStatus.Pending,
        requestJson: JSON.parse(JSON.stringify(request)) as Prisma.InputJsonValue
      }
    });
    await this.queue.enqueue({ renderJobId: id });
    return { renderJobId: id, status: "Pending", statusUrl: `${this.baseUrl}/api/renders/${id}` };
  }
}

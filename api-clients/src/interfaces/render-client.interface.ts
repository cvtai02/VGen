import type { CreateCompositeRenderJobRequestDto } from "../dtos/renders/create-composite-render-job-request.dto.js";
import type { CreateIntroRenderJobRequestDto } from "../dtos/renders/create-intro-render-job-request.dto.js";
import type { CreateRenderJobResponseDto } from "../dtos/renders/create-render-job-response.dto.js";
import type { RenderJobResultDto } from "../dtos/renders/render-job-result.dto.js";

export interface RenderClient {
  createCompositeRenderJob(request: CreateCompositeRenderJobRequestDto): Promise<CreateRenderJobResponseDto>;
  createIntroRenderJob(request: CreateIntroRenderJobRequestDto): Promise<CreateRenderJobResponseDto>;
  getRenderJob(renderJobId: string): Promise<RenderJobResultDto>;
  listRenderJobs(): Promise<RenderJobResultDto[]>;
}

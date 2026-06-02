import type { RenderClient } from "../interfaces/render-client.interface.js";
import type { CreateCompositeRenderJobRequestDto } from "../dtos/renders/create-composite-render-job-request.dto.js";
import type { CreateIntroRenderJobRequestDto } from "../dtos/renders/create-intro-render-job-request.dto.js";
import type { CreateRenderJobResponseDto } from "../dtos/renders/create-render-job-response.dto.js";
import type { RenderJobResultDto } from "../dtos/renders/render-job-result.dto.js";

export class FetchRenderClient implements RenderClient {
  constructor(private readonly baseUrl: string) {}

  createCompositeRenderJob(request: CreateCompositeRenderJobRequestDto): Promise<CreateRenderJobResponseDto> {
    return this.post("/api/renders/composite", request);
  }

  createIntroRenderJob(request: CreateIntroRenderJobRequestDto): Promise<CreateRenderJobResponseDto> {
    return this.post("/api/renders/intro", request);
  }

  getRenderJob(renderJobId: string): Promise<RenderJobResultDto> {
    return this.get(`/api/renders/${renderJobId}`);
  }

  listRenderJobs(): Promise<RenderJobResultDto[]> {
    return this.get("/api/renders");
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) throw new Error(`GET ${path} failed: ${response.status}`);
    return response.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`POST ${path} failed: ${response.status}`);
    return response.json() as Promise<T>;
  }
}

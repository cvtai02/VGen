import type { RenderJobErrorDto } from "./render-job-error.dto.js";
import type { RenderJobOutputDto } from "./render-job-output.dto.js";

export interface RenderJobResultDto {
  id: string;
  type: "Composite" | "Intro" | "Zhihugen";
  status: "Pending" | "Rendering" | "Completed" | "Failed" | "Cancelled";
  output?: RenderJobOutputDto;
  error?: RenderJobErrorDto;
  createdAt: string;
  updatedAt: string;
}

import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";

export function generateJobId(): string {
  const now = new Date();
  const d = now.toISOString();
  const date = d.slice(0, 10).replace(/-/g, "");
  const time = d.slice(11, 19).replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `job_${date}_${time}_${rand}`;
}

export function generateOutputFilename(): string {
  const now = new Date();
  const d = now.toISOString();
  const date = d.slice(0, 10).replace(/-/g, "");
  const time = d.slice(11, 19).replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  return `${date}_${time}_${rand}.mp4`;
}

export function toZhihugenStatus(dbStatus: string): "pending" | "awaiting_upload" | "completed" | "failed" {
  if (dbStatus === RenderJobStatus.Completed) return "completed";
  if (dbStatus === RenderJobStatus.AwaitingUpload) return "awaiting_upload";
  if (dbStatus === RenderJobStatus.Failed || dbStatus === RenderJobStatus.Cancelled) return "failed";
  return "pending";
}

export interface ZhihugenJobRequest {
  images: string[];
  scripts: string[];
  label: string;
  outputFilename: string;
  outputDirectory: string;
  backgroundVideoPath: string;
  ttsModel: string;
  resolution: string;
  fps: number;
  imageFit: "contain" | "cover";
  sceneCount: number;
  previewBeforeUpload?: boolean;
  backgroundVideoLocalPath?: string;
}

export interface ZhihugenJobResult {
  absolutePath?: string;
  cdnUrl?: string;
  localPath?: string;
  label: string;
}

export function formatJobResponse(job: {
  id: string;
  status: string;
  requestJson: string;
  resultJson: string | null;
  errorMessage: string | null;
}) {
  const req = JSON.parse(job.requestJson) as ZhihugenJobRequest;
  const result = job.resultJson ? (JSON.parse(job.resultJson) as ZhihugenJobResult) : null;
  const status = toZhihugenStatus(job.status);
  const base = { jobId: job.id, status, label: req.label };

  if (status === "completed") return { ...base, absolutePath: result?.absolutePath, cdnUrl: result?.cdnUrl };
  if (status === "failed") return { ...base, error: job.errorMessage ?? "Unknown error" };
  return base;
}

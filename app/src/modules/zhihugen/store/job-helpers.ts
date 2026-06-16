import { randomInt } from "node:crypto";
import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";

function timestampSlug(): { date: string; time: string; rand: string } {
  const d = new Date().toISOString();
  return {
    date: d.slice(0, 10).replace(/-/g, ""),
    time: d.slice(11, 19).replace(/:/g, ""),
    rand: randomInt(1_000_000).toString().padStart(6, "0")
  };
}

export function generateJobId(): string {
  const { date, time, rand } = timestampSlug();
  return `job_${date}_${time}_${rand}`;
}

export function generateOutputFilename(): string {
  const { date, time, rand } = timestampSlug();
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

function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

export function formatJobResponse(job: {
  id: string;
  status: string;
  requestJson: string;
  resultJson: string | null;
  errorMessage: string | null;
}) {
  const req = safeJsonParse<ZhihugenJobRequest>(job.requestJson);
  const result = safeJsonParse<ZhihugenJobResult>(job.resultJson);
  const status = toZhihugenStatus(job.status);
  const base = { jobId: job.id, status, label: req?.label ?? "Unknown" };

  if (status === "completed") return { ...base, absolutePath: result?.absolutePath, cdnUrl: result?.cdnUrl };
  if (status === "failed") return { ...base, error: job.errorMessage ?? "Unknown error" };
  return base;
}

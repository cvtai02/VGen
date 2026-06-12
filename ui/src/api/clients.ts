export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StorageSettings {
  baseUrl: string;
  accessToken: string;
}

export interface TtsSettings {
  baseUrl: string;
  apiKey: string;
}

export type ZhihugenRenderResponseDto =
  | { absolutePath: string }
  | { jobId: string; status: "awaiting_upload" };

export interface ZhihugenJobDto {
  jobId: string;
  status: "pending" | "awaiting_upload" | "completed" | "failed";
  label?: string;
  absolutePath?: string;
  cdnUrl?: string;
  error?: string;
}

export interface TtsModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

export interface ZhihugenSettings {
  defaultOutputDirectory: string;
  defaultBackgroundVideoPath: string;
  defaultFps: number;
  defaultImageFit: "contain" | "cover";
  defaultResolution: string;
  defaultTtsModel: string;
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, options);
  if (!res.ok) throw new Error(`${options?.method ?? "GET"} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Clients ──────────────────────────────────────────────────────────────────

export const zhihugenClient = {
  // Render
  render: (form: FormData) =>
    apiFetch<ZhihugenRenderResponseDto>("/api/zhihugen/render", {
      method: "POST",
      body: form
    }),

  // Jobs
  listJobs: () => apiFetch<ZhihugenJobDto[]>("/api/zhihugen/jobs"),
  getJob: (id: string) => apiFetch<ZhihugenJobDto>(`/api/zhihugen/jobs/${encodeURIComponent(id)}`),

  // Preview workflow
  previewUrl: (id: string) => `${apiBaseUrl}/api/zhihugen/jobs/${encodeURIComponent(id)}/preview`,
  confirmUpload: (id: string) =>
    apiFetch<{ absolutePath: string; cdnUrl?: string }>(`/api/zhihugen/jobs/${encodeURIComponent(id)}/confirm-upload`, { method: "POST" }),
  discardJob: (id: string) =>
    apiFetch<{ status: string }>(`/api/zhihugen/jobs/${encodeURIComponent(id)}/discard`, { method: "POST" }),

  // Settings
  getSettings: () => apiFetch<ZhihugenSettings>("/api/features/zhihugen/settings"),
  updateSettings: (s: Partial<ZhihugenSettings>) =>
    apiFetch<ZhihugenSettings>("/api/features/zhihugen/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(s)
    }),

  // TTS models
  listTtsModels: () => apiFetch<{ models: TtsModel[]; defaultModelId: string }>("/api/tts/models"),
};

export const settingsClient = {
  getStorage: () => apiFetch<StorageSettings>("/api/settings/storage"),
  updateStorage: (body: Partial<StorageSettings>) =>
    apiFetch<StorageSettings>("/api/settings/storage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }),

  getTts: () => apiFetch<TtsSettings>("/api/settings/tts"),
  updateTts: (body: Partial<TtsSettings>) =>
    apiFetch<TtsSettings>("/api/settings/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }),

  getZhihugen: () => apiFetch<ZhihugenSettings>("/api/features/zhihugen/settings"),
  updateZhihugen: (body: Partial<ZhihugenSettings>) =>
    apiFetch<ZhihugenSettings>("/api/features/zhihugen/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }),
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface StorageSettings {
  baseUrl: string;
  accessToken: string;
  hasAccessToken?: boolean;
}

export interface TtsSettings {
  baseUrl: string;
  apiKey: string;
  hasApiKey?: boolean;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  hasBotToken?: boolean;
  chatId: string;
  captionTemplate: string;
}

export interface StorageAccessDirectory {
  path: string;
  access: string;
}

export interface StorageAccessResponse {
  isAdmin: boolean;
  directories: StorageAccessDirectory[];
}

export interface StorageBrowseItem {
  name: string;
  absolutePath: string;
  type: "file" | "folder" | string;
  sizeBytes?: number;
  cdnUrl?: string;
}

export interface StorageBrowseResponse {
  items: StorageBrowseItem[];
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
  telegram?: {
    provider: "telegram";
    status: "sent" | "failed";
    chatId?: string;
    messageId?: number;
    fileId?: string;
    link?: string;
    sentAt?: string;
    error?: string;
    failedAt?: string;
  } | null;
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

interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
}

interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

const authTokenKey = "vgen.adminToken";
export const authExpiredEventName = "vgen:auth-expired";

export function getAuthToken(): string {
  return localStorage.getItem(authTokenKey) ?? "";
}

export function setAuthToken(token: string): void {
  localStorage.setItem(authTokenKey, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(authTokenKey);
}

function withAuthHeaders(options?: RequestInit): RequestInit {
  const token = getAuthToken();
  const headers = new Headers(options?.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return { ...options, headers };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, withAuthHeaders(options));
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event(authExpiredEventName));
    }
    let errorMessage = `${options?.method ?? "GET"} ${path} failed with ${res.status}`;
    try {
      const body = (await res.json()) as Partial<ApiError>;
      if (body.message) errorMessage = body.message;
    } catch {
      // Ignore non-JSON error bodies.
    }
    throw new Error(errorMessage);
  }
  return res.json() as Promise<T>;
}

async function apiBlob(path: string): Promise<Blob> {
  const res = await fetch(`${apiBaseUrl}${path}`, withAuthHeaders());
  if (!res.ok) {
    if (res.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new Event(authExpiredEventName));
    }
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return res.blob();
}

export const authClient = {
  login: (systemSecret: string) =>
    apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemSecret })
    })
};

export const zhihugenClient = {
  render: (form: FormData) =>
    apiFetch<ZhihugenRenderResponseDto>("/api/zhihugen/render", {
      method: "POST",
      body: form
    }),

  listJobs: () => apiFetch<ZhihugenJobDto[]>("/api/zhihugen/jobs"),
  getJob: (id: string) => apiFetch<ZhihugenJobDto>(`/api/zhihugen/jobs/${encodeURIComponent(id)}`),
  previewBlob: (id: string) => apiBlob(`/api/zhihugen/jobs/${encodeURIComponent(id)}/preview`),
  confirmUpload: (id: string) =>
    apiFetch<{ absolutePath: string; cdnUrl?: string }>(`/api/zhihugen/jobs/${encodeURIComponent(id)}/confirm-upload`, { method: "POST" }),
  discardJob: (id: string) =>
    apiFetch<{ status: string }>(`/api/zhihugen/jobs/${encodeURIComponent(id)}/discard`, { method: "POST" }),

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

  getTelegram: () => apiFetch<TelegramSettings>("/api/settings/telegram"),
  updateTelegram: (body: Partial<TelegramSettings>) =>
    apiFetch<TelegramSettings>("/api/settings/telegram", {
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

export const storageClient = {
  listDirectories: () => apiFetch<StorageAccessResponse>("/api/storage/directories"),
  browse: (path: string) => apiFetch<StorageBrowseResponse>(`/api/storage/browse?path=${encodeURIComponent(path)}`),
};

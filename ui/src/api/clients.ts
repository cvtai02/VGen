import { FetchRenderClient, FetchSettingsClient } from "api-clients";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const renderClient = new FetchRenderClient(apiBaseUrl);
export const settingsClient = new FetchSettingsClient(apiBaseUrl);

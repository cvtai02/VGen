import type { RuntimeSettings } from "../../../config/settings.schema.js";

export interface SettingsStore {
  get(): Promise<RuntimeSettings>;
  update(settings: RuntimeSettings): Promise<RuntimeSettings>;
}

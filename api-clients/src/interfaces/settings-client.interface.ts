import type { PublicSettingsDto } from "../dtos/settings/public-settings.dto.js";
import type { UpdateSettingsResponseDto } from "../dtos/settings/update-settings-response.dto.js";

export interface SettingsClient {
  getSettings(): Promise<PublicSettingsDto>;
  updateSettings(settings: PublicSettingsDto, adminAccessToken: string): Promise<UpdateSettingsResponseDto>;
}

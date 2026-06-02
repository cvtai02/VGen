import type { PublicSettingsDto } from "./public-settings.dto.js";

export interface UpdateSettingsResponseDto {
  settings: PublicSettingsDto;
  restartRequired: boolean;
}

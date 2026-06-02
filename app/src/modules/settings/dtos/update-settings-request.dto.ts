import type { PublicSettingsDto } from "./public-settings.dto.js";

export interface UpdateSettingsRequestDto {
  settings: PublicSettingsDto;
  adminAccessToken: string;
}

import type { PublicSettingsDto } from "../dtos/settings/public-settings.dto.js";
import type { UpdateSettingsResponseDto } from "../dtos/settings/update-settings-response.dto.js";
import type { SettingsClient } from "../interfaces/settings-client.interface.js";

export class FetchSettingsClient implements SettingsClient {
  constructor(private readonly baseUrl: string) {}

  async getSettings(): Promise<PublicSettingsDto> {
    const response = await fetch(`${this.baseUrl}/api/settings`);
    if (!response.ok) throw new Error(`GET /api/settings failed: ${response.status}`);
    return response.json() as Promise<PublicSettingsDto>;
  }

  async updateSettings(settings: PublicSettingsDto, adminAccessToken: string): Promise<UpdateSettingsResponseDto> {
    const response = await fetch(`${this.baseUrl}/api/settings`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${adminAccessToken}`
      },
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error(`PUT /api/settings failed: ${response.status}`);
    return response.json() as Promise<UpdateSettingsResponseDto>;
  }
}

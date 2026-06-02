import type { SettingsStore } from "../../../core/shared-kernel/contracts/settings-store.js";
import type { RuntimeSettings } from "../../../config/settings.schema.js";
import type { UpdateSettingsRequestDto } from "../dtos/update-settings-request.dto.js";
import type { UpdateSettingsResponseDto } from "../dtos/update-settings-response.dto.js";
import { GetSettingsUseCase } from "./get-settings.usecase.js";

export class UpdateSettingsUseCase {
  constructor(private readonly settingsStore: SettingsStore) {}

  async execute(request: UpdateSettingsRequestDto): Promise<UpdateSettingsResponseDto> {
    const current = await this.settingsStore.get();
    if (request.adminAccessToken !== current.app.adminAccessToken) {
      throw new Error("Invalid admin access token.");
    }

    const restartRequired = requiresRestart(current, request.settings);
    await this.settingsStore.update(request.settings);
    const sanitized = await new GetSettingsUseCase(this.settingsStore).execute();
    return { settings: sanitized, restartRequired };
  }
}

function requiresRestart(current: RuntimeSettings, next: RuntimeSettings): boolean {
  return current.database.url !== next.database.url || current.redis.url !== next.redis.url;
}

import type { SettingsStore } from "../../../core/shared-kernel/contracts/settings-store.js";
import type { PublicSettingsDto } from "../dtos/public-settings.dto.js";

export class GetSettingsUseCase {
  constructor(private readonly settingsStore: SettingsStore) {}

  async execute(): Promise<PublicSettingsDto> {
    const settings = await this.settingsStore.get();
    return {
      ...settings,
      app: { ...settings.app, adminAccessToken: mask(settings.app.adminAccessToken) },
      storage: { ...settings.storage, accessToken: mask(settings.storage.accessToken) },
      tts: { ...settings.tts, accessToken: mask(settings.tts.accessToken) },
      mediaSource: { ...settings.mediaSource, accessToken: mask(settings.mediaSource.accessToken) }
    };
  }
}

function mask(value: string): string {
  return value ? "********" : "";
}

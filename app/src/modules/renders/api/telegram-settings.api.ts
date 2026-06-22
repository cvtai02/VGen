import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { TelegramSettingsResponseDto } from "../dtos/telegram-settings-response.dto.js";
import { redactTelegramSettings } from "./telegram-settings-helpers.js";

export async function registerTelegramSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: TelegramSettingsResponseDto }>("/api/settings/telegram", async () => {
    return redactTelegramSettings(container.settings.telegram);
  });
}

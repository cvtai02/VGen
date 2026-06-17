import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { TelegramSettingsResponseDto } from "../dtos/telegram-settings-response.dto.js";
import type { UpdateTelegramSettingsRequestDto } from "../dtos/update-telegram-settings-request.dto.js";
import { redactTelegramSettings, saveTelegramSettings } from "./telegram-settings-helpers.js";

export async function registerTelegramSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: TelegramSettingsResponseDto }>("/api/settings/telegram", async () => {
    return redactTelegramSettings(container.settings.telegram);
  });

  app.post<{ Body: UpdateTelegramSettingsRequestDto; Reply: TelegramSettingsResponseDto }>("/api/settings/telegram", async (request, reply) => {
    const { enabled, captionTemplate } = request.body ?? {};
    const telegram = {
      ...container.settings.telegram,
      enabled: enabled ?? container.settings.telegram.enabled,
      captionTemplate: captionTemplate ?? container.settings.telegram.captionTemplate
    };

    await saveTelegramSettings(container, telegram);
    return reply.code(200).send(redactTelegramSettings(telegram));
  });
}

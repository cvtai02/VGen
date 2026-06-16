import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { TelegramSettingsResponseDto } from "../dtos/telegram-settings-response.dto.js";
import type { UpdateTelegramSettingsRequestDto } from "../dtos/update-telegram-settings-request.dto.js";

const MASKED_SECRET = "********";

function redact(secret: string): string {
  return secret ? MASKED_SECRET : "";
}

export async function registerTelegramSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Reply: TelegramSettingsResponseDto }>("/api/settings/telegram", async () => {
    const settings = container.settings.telegram;
    return {
      enabled: settings.enabled,
      botToken: redact(settings.botToken),
      hasBotToken: !!settings.botToken,
      chatId: settings.chatId,
      captionTemplate: settings.captionTemplate
    };
  });

  app.post<{ Body: UpdateTelegramSettingsRequestDto; Reply: TelegramSettingsResponseDto }>("/api/settings/telegram", async (request, reply) => {
    const { enabled, botToken, chatId, captionTemplate } = request.body ?? {};
    const nextBotToken =
      botToken === undefined || botToken === MASKED_SECRET
        ? container.settings.telegram.botToken
        : botToken;

    const updated = {
      ...container.settings,
      telegram: {
        ...container.settings.telegram,
        enabled: enabled ?? container.settings.telegram.enabled,
        botToken: nextBotToken,
        chatId: chatId ?? container.settings.telegram.chatId,
        captionTemplate: captionTemplate ?? container.settings.telegram.captionTemplate
      }
    };

    await container.settingsLoader.save(updated);
    container.settings.telegram = updated.telegram;
    return reply.code(200).send({
      enabled: updated.telegram.enabled,
      botToken: redact(updated.telegram.botToken),
      hasBotToken: !!updated.telegram.botToken,
      chatId: updated.telegram.chatId,
      captionTemplate: updated.telegram.captionTemplate
    });
  });
}

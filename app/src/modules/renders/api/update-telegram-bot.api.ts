import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { UpdateTelegramBotRequestDto } from "../dtos/update-telegram-bot-request.dto.js";
import type { TelegramBotDto } from "../dtos/telegram-settings-response.dto.js";
import { findBotOrThrow, redactBot, saveTelegramSettings, telegramRequest, type TelegramBotInfo } from "./telegram-settings-helpers.js";

const MASKED_SECRET = "********";

export async function registerUpdateTelegramBotApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.patch<{ Params: { botId: string }; Body: UpdateTelegramBotRequestDto; Reply: TelegramBotDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots/:botId",
    async (request, reply) => {
      try {
        const bot = findBotOrThrow(container.settings.telegram, request.params.botId);
        if (request.body?.name !== undefined) bot.name = request.body.name.trim() || bot.name;
        if (request.body?.botToken !== undefined && request.body.botToken !== MASKED_SECRET) {
          const nextToken = request.body.botToken.trim();
          if (!nextToken) return reply.code(400).send(apiError(400, "Bad Request", "botToken cannot be empty."));
          const botInfo = await telegramRequest<TelegramBotInfo>(nextToken, "getMe");
          bot.botToken = nextToken;
          bot.username = botInfo.username;
          if (!request.body.name) bot.name = botInfo.first_name || botInfo.username || bot.name;
        }
        await saveTelegramSettings(container, container.settings.telegram);
        return redactBot(bot);
      } catch (error) {
        return reply.code(404).send(apiError(404, "Not Found", error instanceof Error ? error.message : "Telegram bot not found."));
      }
    }
  );
}

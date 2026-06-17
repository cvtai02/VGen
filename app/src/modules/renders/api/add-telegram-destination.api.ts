import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { AddTelegramDestinationRequestDto } from "../dtos/add-telegram-destination-request.dto.js";
import type { TelegramBotDto } from "../dtos/telegram-settings-response.dto.js";
import { findBotOrThrow, redactBot, saveTelegramSettings, telegramRequest, upsertDestination, type TelegramChatInfo } from "./telegram-settings-helpers.js";

export async function registerAddTelegramDestinationApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Params: { botId: string }; Body: AddTelegramDestinationRequestDto; Reply: TelegramBotDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots/:botId/destinations",
    async (request, reply) => {
      try {
        const bot = findBotOrThrow(container.settings.telegram, request.params.botId);
        const chatId = request.body?.chatId?.trim();
        if (!chatId) return reply.code(400).send(apiError(400, "Bad Request", "chatId is required."));
        const chat = await telegramRequest<TelegramChatInfo>(bot.botToken, "getChat", { chat_id: chatId });
        upsertDestination(bot, chat, request.body?.name);
        await saveTelegramSettings(container, container.settings.telegram);
        return redactBot(bot);
      } catch (error) {
        return reply.code(400).send(apiError(400, "Bad Request", error instanceof Error ? error.message : "Failed to add Telegram destination."));
      }
    }
  );
}

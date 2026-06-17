import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { AddTelegramBotRequestDto } from "../dtos/add-telegram-bot-request.dto.js";
import type { TelegramBotDto } from "../dtos/telegram-settings-response.dto.js";
import { createBot, redactBot, saveTelegramSettings, telegramRequest, upsertDestination, type TelegramBotInfo, type TelegramChatInfo } from "./telegram-settings-helpers.js";

export async function registerAddTelegramBotApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Body: AddTelegramBotRequestDto; Reply: TelegramBotDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots",
    async (request, reply) => {
      try {
        const botToken = request.body?.botToken?.trim();
        if (!botToken) return reply.code(400).send(apiError(400, "Bad Request", "botToken is required."));

        const botInfo = await telegramRequest<TelegramBotInfo>(botToken, "getMe");
        const bot = createBot({ name: request.body?.name, botToken, bot: botInfo });
        const chatId = request.body?.chatId?.trim();
        if (chatId) {
          const chat = await telegramRequest<TelegramChatInfo>(botToken, "getChat", { chat_id: chatId });
          upsertDestination(bot, chat, request.body?.chatName);
        }

        const telegram = {
          ...container.settings.telegram,
          bots: [...container.settings.telegram.bots, bot]
        };
        await saveTelegramSettings(container, telegram);
        return reply.code(201).send(redactBot(bot));
      } catch (error) {
        return reply.code(400).send(apiError(400, "Bad Request", error instanceof Error ? error.message : "Failed to add Telegram bot."));
      }
    }
  );
}

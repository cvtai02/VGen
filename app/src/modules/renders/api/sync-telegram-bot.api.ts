import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { SyncTelegramBotResponseDto } from "../dtos/sync-telegram-bot-response.dto.js";
import { extractTelegramChats, findBotOrThrow, redactBot, refreshTelegramChat, saveTelegramSettings, telegramRequest, upsertDestination } from "./telegram-settings-helpers.js";

export async function registerSyncTelegramBotApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Params: { botId: string }; Reply: SyncTelegramBotResponseDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots/:botId/sync",
    async (request, reply) => {
      try {
        const bot = findBotOrThrow(container.settings.telegram, request.params.botId);
        const updates = await telegramRequest<Parameters<typeof extractTelegramChats>[0]>(bot.botToken, "getUpdates", {
          limit: 100,
          allowed_updates: ["message", "channel_post", "edited_message", "edited_channel_post", "my_chat_member", "chat_member", "callback_query"]
        });
        const candidateChats = new Map<string, Awaited<ReturnType<typeof refreshTelegramChat>>>();
        for (const chat of extractTelegramChats(updates)) {
          const refreshed = await refreshTelegramChat(bot.botToken, chat);
          candidateChats.set(String(refreshed.id), refreshed);
        }
        for (const destination of bot.destinations) {
          const refreshed = await refreshTelegramChat(bot.botToken, { id: destination.chatId }).catch(() => null);
          if (refreshed) candidateChats.set(String(refreshed.id), refreshed);
        }

        let created = 0;
        let updated = 0;
        for (const chat of candidateChats.values()) {
          const result = upsertDestination(bot, chat);
          if (result.created) created++;
          else updated++;
        }
        await saveTelegramSettings(container, container.settings.telegram);
        return {
          created,
          updated,
          discovered: candidateChats.size,
          warning: candidateChats.size === 0 ? "No chats discovered yet. Add the bot to a group and send a message, or add a destination manually." : undefined,
          bot: redactBot(bot)
        };
      } catch (error) {
        return reply.code(400).send(apiError(400, "Bad Request", error instanceof Error ? error.message : "Telegram sync failed."));
      }
    }
  );
}

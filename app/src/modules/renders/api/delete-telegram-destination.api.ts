import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { TelegramBotDto } from "../dtos/telegram-settings-response.dto.js";
import { findBotOrThrow, redactBot, saveTelegramSettings } from "./telegram-settings-helpers.js";

export async function registerDeleteTelegramDestinationApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.delete<{ Params: { botId: string; destinationId: string }; Reply: TelegramBotDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots/:botId/destinations/:destinationId",
    async (request, reply) => {
      try {
        const bot = findBotOrThrow(container.settings.telegram, request.params.botId);
        const nextDestinations = bot.destinations.filter((destination) => destination.id !== request.params.destinationId);
        if (nextDestinations.length === bot.destinations.length) {
          return reply.code(404).send(apiError(404, "Not Found", "Telegram destination not found."));
        }
        bot.destinations = nextDestinations;
        await saveTelegramSettings(container, container.settings.telegram);
        return redactBot(bot);
      } catch (error) {
        return reply.code(404).send(apiError(404, "Not Found", error instanceof Error ? error.message : "Telegram bot not found."));
      }
    }
  );
}

import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { UpdateTelegramDestinationRequestDto } from "../dtos/update-telegram-destination-request.dto.js";
import type { TelegramBotDto } from "../dtos/telegram-settings-response.dto.js";
import { findBotOrThrow, redactBot, saveTelegramSettings } from "./telegram-settings-helpers.js";

export async function registerUpdateTelegramDestinationApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.patch<{ Params: { botId: string; destinationId: string }; Body: UpdateTelegramDestinationRequestDto; Reply: TelegramBotDto | { statusCode: number; error: string; message: string } }>(
    "/api/telegram/bots/:botId/destinations/:destinationId",
    async (request, reply) => {
      try {
        const bot = findBotOrThrow(container.settings.telegram, request.params.botId);
        const destination = bot.destinations.find((item) => item.id === request.params.destinationId);
        if (!destination) return reply.code(404).send(apiError(404, "Not Found", "Telegram destination not found."));
        if (request.body?.name !== undefined) destination.name = request.body.name.trim() || destination.name;
        await saveTelegramSettings(container, container.settings.telegram);
        return redactBot(bot);
      } catch (error) {
        return reply.code(404).send(apiError(404, "Not Found", error instanceof Error ? error.message : "Telegram destination not found."));
      }
    }
  );
}

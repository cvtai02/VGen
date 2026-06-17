import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";

export async function registerDeleteTelegramBotApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.delete<{ Params: { botId: string } }>("/api/telegram/bots/:botId", async (request, reply) => {
    const nextBots = container.settings.telegram.bots.filter((bot) => bot.id !== request.params.botId);
    if (nextBots.length === container.settings.telegram.bots.length) {
      return reply.code(404).send(apiError(404, "Not Found", "Telegram bot not found."));
    }
    const telegram = { ...container.settings.telegram, bots: nextBots };
    await container.settingsLoader.save({ ...container.settings, telegram });
    container.settings.telegram = telegram;
    return { status: "deleted" };
  });
}

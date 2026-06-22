import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryInput, VideoDeliveryOutcome, VideoDeliveryResult } from "../../../core/shared-kernel/contracts/video-delivery-client.js";

interface TelegramDestinationSettings {
  id: string;
  chatId: string;
  name: string;
}

interface TelegramBotSettings {
  id: string;
  name: string;
  botToken: string;
  destinations: TelegramDestinationSettings[];
}

interface TelegramSettings {
  bots: TelegramBotSettings[];
}

interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
  result?: {
    message_id: number;
    chat?: { id?: number | string; username?: string };
  };
}

export class TelegramVideoDeliveryClient implements VideoDeliveryClient {
  constructor(private readonly getSettings: () => TelegramSettings) {}

  async deliverVideo(input: VideoDeliveryInput): Promise<VideoDeliveryOutcome[] | null> {
    const settings = this.getSettings();
    const allTargets = settings.bots
      .flatMap((bot) => bot.destinations.map((destination) => ({ bot, destination })));
    const targets = input.destinationIds?.length
      ? allTargets.filter(({ destination }) => input.destinationIds!.includes(destination.id))
      : allTargets;
    if (targets.length === 0) return null;

    const outcomes: VideoDeliveryOutcome[] = [];

    for (const { bot, destination } of targets) {
      try {
        outcomes.push(await this.sendToDestination(bot, destination, input));
      } catch (error) {
        outcomes.push(this.toFailure(bot, destination, error));
      }
    }

    return outcomes;
  }

  private async sendToDestination(
    bot: TelegramBotSettings,
    destination: TelegramDestinationSettings,
    input: VideoDeliveryInput
  ): Promise<VideoDeliveryResult> {
    if (!bot.botToken.trim()) throw new Error("Telegram bot token is not configured.");
    if (!destination.chatId.trim()) throw new Error("Telegram chat ID is not configured.");

    const response = await fetch(`https://api.telegram.org/bot${bot.botToken.trim()}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: destination.chatId.trim(),
        text: input.caption.slice(0, 4096),
        disable_web_page_preview: true
      })
    });
    const body = await response.json().catch(() => ({})) as TelegramSendMessageResponse;

    if (!response.ok || !body.ok || !body.result) {
      throw new Error(body.description ?? `Telegram sendMessage failed: ${response.status}`);
    }

    const configuredChatId = destination.chatId.trim();
    const chatId = String(body.result.chat?.id ?? configuredChatId);
    return {
      provider: "telegram",
      status: "sent",
      botId: bot.id,
      botName: bot.name,
      destinationId: destination.id,
      destinationName: destination.name,
      chatId,
      messageId: body.result.message_id,
      link: this.createMessageLink(configuredChatId, body.result.message_id),
      sentAt: new Date().toISOString()
    };
  }

  private toFailure(bot: TelegramBotSettings, destination: TelegramDestinationSettings, error: unknown): VideoDeliveryFailure {
    return {
      provider: "telegram",
      status: "failed",
      botId: bot.id,
      botName: bot.name,
      destinationId: destination.id,
      destinationName: destination.name,
      chatId: destination.chatId,
      error: error instanceof Error ? error.message : "Telegram delivery failed.",
      failedAt: new Date().toISOString()
    };
  }

  private createMessageLink(chatId: string, messageId: number): string | undefined {
    if (!chatId.startsWith("@")) return undefined;
    return `https://t.me/${chatId.slice(1)}/${messageId}`;
  }
}

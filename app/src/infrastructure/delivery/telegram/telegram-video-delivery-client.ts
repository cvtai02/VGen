import { readFile, stat } from "node:fs/promises";
import type { VideoDeliveryClient, VideoDeliveryFailure, VideoDeliveryInput, VideoDeliveryOutcome, VideoDeliveryResult } from "../../../core/shared-kernel/contracts/video-delivery-client.js";

interface TelegramDestinationSettings {
  id: string;
  chatId: string;
  name: string;
  enabled: boolean;
}

interface TelegramBotSettings {
  id: string;
  name: string;
  botToken: string;
  enabled: boolean;
  destinations: TelegramDestinationSettings[];
}

interface TelegramSettings {
  enabled: boolean;
  bots: TelegramBotSettings[];
}

interface TelegramSendVideoResponse {
  ok: boolean;
  description?: string;
  result?: {
    message_id: number;
    chat?: { id?: number | string; username?: string };
    video?: { file_id?: string };
  };
}

export class TelegramVideoDeliveryClient implements VideoDeliveryClient {
  constructor(private readonly getSettings: () => TelegramSettings) {}

  async deliverVideo(input: VideoDeliveryInput): Promise<VideoDeliveryOutcome[] | null> {
    const settings = this.getSettings();
    if (!settings.enabled) return null;
    const allTargets = settings.bots
      .filter((bot) => bot.enabled)
      .flatMap((bot) => bot.destinations.filter((destination) => destination.enabled).map((destination) => ({ bot, destination })));
    const targets = input.destinationIds?.length
      ? allTargets.filter(({ destination }) => input.destinationIds!.includes(destination.id))
      : allTargets;
    if (targets.length === 0) return null;

    const fileStat = await stat(input.localPath);
    if (fileStat.size > 50 * 1024 * 1024) {
      throw new Error("Telegram Bot API sendVideo supports uploads up to 50 MB. Use a smaller video or a local Bot API server.");
    }

    const fileContent = await readFile(input.localPath);
    const outcomes: VideoDeliveryOutcome[] = [];

    for (const { bot, destination } of targets) {
      try {
        outcomes.push(await this.sendToDestination(bot, destination, input, fileContent));
      } catch (error) {
        outcomes.push(this.toFailure(bot, destination, error));
      }
    }

    return outcomes;
  }

  private async sendToDestination(
    bot: TelegramBotSettings,
    destination: TelegramDestinationSettings,
    input: VideoDeliveryInput,
    fileContent: Buffer
  ): Promise<VideoDeliveryResult> {
    if (!bot.botToken.trim()) throw new Error("Telegram bot token is not configured.");
    if (!destination.chatId.trim()) throw new Error("Telegram chat ID is not configured.");

    const form = new FormData();
    form.set("chat_id", destination.chatId.trim());
    form.set("caption", input.caption.slice(0, 1024));
    form.set("supports_streaming", "true");
    form.set("video", new Blob([new Uint8Array(fileContent)], { type: "video/mp4" }), input.filename);

    const response = await fetch(`https://api.telegram.org/bot${bot.botToken.trim()}/sendVideo`, {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({})) as TelegramSendVideoResponse;

    if (!response.ok || !body.ok || !body.result) {
      throw new Error(body.description ?? `Telegram sendVideo failed: ${response.status}`);
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
      fileId: body.result.video?.file_id,
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

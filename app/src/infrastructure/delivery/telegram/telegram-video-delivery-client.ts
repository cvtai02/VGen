import { readFile, stat } from "node:fs/promises";
import type { VideoDeliveryClient, VideoDeliveryInput, VideoDeliveryResult } from "../../../core/shared-kernel/contracts/video-delivery-client.js";

interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
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

  async deliverVideo(input: VideoDeliveryInput): Promise<VideoDeliveryResult | null> {
    const settings = this.getSettings();
    if (!settings.enabled) return null;
    if (!settings.botToken.trim()) throw new Error("Telegram bot token is not configured.");
    if (!settings.chatId.trim()) throw new Error("Telegram group chat ID is not configured.");

    const fileStat = await stat(input.localPath);
    if (fileStat.size > 50 * 1024 * 1024) {
      throw new Error("Telegram Bot API sendVideo supports uploads up to 50 MB. Use a smaller video or a local Bot API server.");
    }

    const fileContent = await readFile(input.localPath);
    const form = new FormData();
    form.set("chat_id", settings.chatId.trim());
    form.set("caption", input.caption.slice(0, 1024));
    form.set("supports_streaming", "true");
    form.set("video", new Blob([fileContent], { type: "video/mp4" }), input.filename);

    const response = await fetch(`https://api.telegram.org/bot${settings.botToken.trim()}/sendVideo`, {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({})) as TelegramSendVideoResponse;

    if (!response.ok || !body.ok || !body.result) {
      throw new Error(body.description ?? `Telegram sendVideo failed: ${response.status}`);
    }

    const chatId = String(body.result.chat?.id ?? settings.chatId.trim());
    return {
      provider: "telegram",
      status: "sent",
      chatId,
      messageId: body.result.message_id,
      fileId: body.result.video?.file_id,
      link: this.createMessageLink(settings.chatId.trim(), body.result.message_id),
      sentAt: new Date().toISOString()
    };
  }

  private createMessageLink(chatId: string, messageId: number): string | undefined {
    if (!chatId.startsWith("@")) return undefined;
    return `https://t.me/${chatId.slice(1)}/${messageId}`;
  }
}

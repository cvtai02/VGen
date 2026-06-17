import { randomUUID } from "node:crypto";
import type { AppContainer } from "../../../container.js";
import type { RuntimeSettings, TelegramBotSettings, TelegramDestinationSettings, TelegramSettings } from "../../../config/settings.schema.js";
import type { TelegramBotDto, TelegramSettingsResponseDto } from "../dtos/telegram-settings-response.dto.js";

const MASKED_SECRET = "********";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramBotInfo = {
  id: number;
  first_name: string;
  username?: string;
};

export type TelegramChatInfo = {
  id: number | string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramUpdate = {
  message?: { chat?: TelegramChatInfo };
  edited_message?: { chat?: TelegramChatInfo };
  channel_post?: { chat?: TelegramChatInfo };
  edited_channel_post?: { chat?: TelegramChatInfo };
  my_chat_member?: { chat?: TelegramChatInfo };
  chat_member?: { chat?: TelegramChatInfo };
  callback_query?: { message?: { chat?: TelegramChatInfo } };
};

export function redactTelegramSettings(settings: TelegramSettings): TelegramSettingsResponseDto {
  return {
    enabled: settings.enabled,
    captionTemplate: settings.captionTemplate,
    bots: settings.bots.map(redactBot)
  };
}

export function redactBot(bot: TelegramBotSettings): TelegramBotDto {
  return {
    ...bot,
    botToken: bot.botToken ? MASKED_SECRET : "",
    hasBotToken: !!bot.botToken,
    destinations: bot.destinations.map((destination) => ({ ...destination }))
  };
}

export async function saveTelegramSettings(container: AppContainer, telegram: TelegramSettings): Promise<RuntimeSettings> {
  const updated = { ...container.settings, telegram };
  await container.settingsLoader.save(updated);
  container.settings.telegram = updated.telegram;
  return updated;
}

export async function telegramRequest<T>(botToken: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}"
  });
  const data = await response.json().catch(() => null) as TelegramApiResponse<T> | null;
  if (!response.ok || !data?.ok || data.result === undefined) {
    throw new Error(data?.description ?? `Telegram ${method} failed: ${response.status}`);
  }
  return data.result;
}

export function createBot(input: { name?: string; botToken: string; bot?: TelegramBotInfo; enabled?: boolean }): TelegramBotSettings {
  const name = input.name?.trim() || input.bot?.first_name || input.bot?.username || "Telegram Bot";
  return {
    id: `tg_bot_${randomUUID()}`,
    name,
    username: input.bot?.username,
    botToken: input.botToken.trim(),
    enabled: input.enabled ?? true,
    destinations: []
  };
}

export function createDestination(chat: TelegramChatInfo, preferredName?: string): TelegramDestinationSettings {
  const chatId = String(chat.id);
  return {
    id: `tg_dest_${randomUUID()}`,
    chatId,
    name: getChatDisplayName(chat, preferredName),
    type: chat.type,
    username: chat.username,
    enabled: true
  };
}

export function upsertDestination(bot: TelegramBotSettings, chat: TelegramChatInfo, preferredName?: string): { created: boolean; destination: TelegramDestinationSettings } {
  const chatId = String(chat.id);
  const usernameId = chat.username ? `@${chat.username}` : undefined;
  const existing = bot.destinations.find((destination) => destination.chatId === chatId || (usernameId && destination.chatId === usernameId));
  if (!existing) {
    const destination = createDestination(chat, preferredName);
    bot.destinations.push(destination);
    return { created: true, destination };
  }

  existing.chatId = usernameId ?? chatId;
  existing.name = getChatDisplayName(chat, preferredName);
  existing.type = chat.type;
  existing.username = chat.username;
  return { created: false, destination: existing };
}

export function extractTelegramChats(updates: TelegramUpdate[]): TelegramChatInfo[] {
  const map = new Map<string, TelegramChatInfo>();
  for (const update of updates) {
    const chats = [
      update.message?.chat,
      update.edited_message?.chat,
      update.channel_post?.chat,
      update.edited_channel_post?.chat,
      update.my_chat_member?.chat,
      update.chat_member?.chat,
      update.callback_query?.message?.chat
    ].filter(Boolean) as TelegramChatInfo[];
    for (const chat of chats) map.set(String(chat.id), chat);
  }
  return [...map.values()];
}

export async function refreshTelegramChat(botToken: string, chat: TelegramChatInfo): Promise<TelegramChatInfo> {
  return telegramRequest<TelegramChatInfo>(botToken, "getChat", { chat_id: chat.id }).catch(() => chat);
}

export function findBotOrThrow(settings: TelegramSettings, botId: string): TelegramBotSettings {
  const bot = settings.bots.find((candidate) => candidate.id === botId);
  if (!bot) throw new Error("Telegram bot not found.");
  return bot;
}

function getChatDisplayName(chat: TelegramChatInfo, preferredName?: string): string {
  const personName = [chat.first_name, chat.last_name].filter(Boolean).join(" ").trim();
  return preferredName?.trim() || chat.title || personName || (chat.username ? `@${chat.username}` : "") || String(chat.id);
}

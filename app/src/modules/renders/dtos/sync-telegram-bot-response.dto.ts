import type { TelegramBotDto } from "./telegram-settings-response.dto.js";

export interface SyncTelegramBotResponseDto {
  created: number;
  updated: number;
  discovered: number;
  warning?: string;
  bot: TelegramBotDto;
}

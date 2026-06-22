export interface TelegramDestinationDto {
  id: string;
  chatId: string;
  name: string;
  type?: string;
  username?: string;
}

export interface TelegramBotDto {
  id: string;
  name: string;
  username?: string;
  botToken: string;
  hasBotToken: boolean;
  destinations: TelegramDestinationDto[];
}

export interface TelegramSettingsResponseDto {
  bots: TelegramBotDto[];
}

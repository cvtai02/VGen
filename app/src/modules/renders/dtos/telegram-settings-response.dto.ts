export interface TelegramDestinationDto {
  id: string;
  chatId: string;
  name: string;
  type?: string;
  username?: string;
  enabled: boolean;
}

export interface TelegramBotDto {
  id: string;
  name: string;
  username?: string;
  botToken: string;
  hasBotToken: boolean;
  enabled: boolean;
  destinations: TelegramDestinationDto[];
}

export interface TelegramSettingsResponseDto {
  enabled: boolean;
  captionTemplate: string;
  bots: TelegramBotDto[];
}

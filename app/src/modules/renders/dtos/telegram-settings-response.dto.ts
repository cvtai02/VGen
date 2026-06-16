export interface TelegramSettingsResponseDto {
  enabled: boolean;
  botToken: string;
  hasBotToken: boolean;
  chatId: string;
  captionTemplate: string;
}

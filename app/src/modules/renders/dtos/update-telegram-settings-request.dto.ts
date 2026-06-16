export interface UpdateTelegramSettingsRequestDto {
  enabled?: boolean;
  botToken?: string;
  chatId?: string;
  captionTemplate?: string;
}

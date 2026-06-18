export interface VideoDeliveryInput {
  localPath: string;
  filename: string;
  caption: string;
  destinationIds?: string[];
}

export interface VideoDeliveryResult {
  provider: "telegram";
  status: "sent";
  botId?: string;
  botName?: string;
  destinationId?: string;
  destinationName?: string;
  chatId: string;
  messageId: number;
  fileId?: string;
  link?: string;
  sentAt: string;
}

export interface VideoDeliveryFailure {
  provider: "telegram";
  status: "failed";
  botId?: string;
  botName?: string;
  destinationId?: string;
  destinationName?: string;
  chatId?: string;
  error: string;
  failedAt: string;
}

export type VideoDeliveryOutcome = VideoDeliveryResult | VideoDeliveryFailure;

export interface VideoDeliveryClient {
  deliverVideo(input: VideoDeliveryInput): Promise<VideoDeliveryOutcome[] | null>;
}

export interface VideoDeliveryInput {
  localPath: string;
  filename: string;
  caption: string;
}

export interface VideoDeliveryResult {
  provider: "telegram";
  status: "sent";
  chatId: string;
  messageId: number;
  fileId?: string;
  link?: string;
  sentAt: string;
}

export interface VideoDeliveryClient {
  deliverVideo(input: VideoDeliveryInput): Promise<VideoDeliveryResult | null>;
}

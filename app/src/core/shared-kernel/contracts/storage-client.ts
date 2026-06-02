export interface StorageUploadInput {
  localPath: string;
  contentType: string;
}

export interface StorageUploadResult {
  url: string;
}

export interface StorageClient {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
}

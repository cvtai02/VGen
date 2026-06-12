export interface StorageUploadInput {
  localPath: string;
  destinationPath: string;
  contentType: string;
}

export interface StorageUploadResult {
  absolutePath: string;
  cdnUrl?: string;
}

export interface StorageClient {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  download(absolutePath: string, destLocalPath: string): Promise<void>;
}

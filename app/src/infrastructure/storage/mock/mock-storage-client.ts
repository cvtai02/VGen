import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

export class MockStorageClient implements StorageClient {
  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    return { url: `mock://storage/${encodeURIComponent(input.localPath)}` };
  }
}

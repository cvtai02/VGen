import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

export class InternalApiStorageClient implements StorageClient {
  constructor(private readonly baseUrl: string, private readonly accessToken: string) {}

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const response = await fetch(`${this.baseUrl}/storage/upload`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Storage upload failed: ${response.status}`);
    }

    return response.json() as Promise<StorageUploadResult>;
  }
}

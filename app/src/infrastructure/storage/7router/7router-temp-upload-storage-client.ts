import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

interface TempUploadUrlResponse {
  absolutePath: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
}

export class SevenRouterTempUploadStorageClient implements StorageClient {
  constructor(
    private readonly getSettings: () => { baseUrl: string; accessToken: string; tempUploadExpiresInSeconds: number }
  ) {}

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const { baseUrl, accessToken, tempUploadExpiresInSeconds } = this.getSettings();
    if (!baseUrl.trim()) throw new Error("7router base URL is not configured.");
    if (!accessToken.trim()) throw new Error("7router access token is not configured.");

    const absolutePath = input.destinationPath;
    const tempUrl = await this.createTempUploadUrl(baseUrl, accessToken, absolutePath, input.contentType, tempUploadExpiresInSeconds);
    const fileContent = await readFile(input.localPath);
    const headers = new Headers(tempUrl.headers ?? {});
    if (!headers.has("content-type")) headers.set("content-type", input.contentType);

    const uploadResponse = await fetch(tempUrl.url, {
      method: tempUrl.method ?? "PUT",
      headers,
      body: new Uint8Array(fileContent)
    });

    if (!uploadResponse.ok) {
      throw new Error(`7router temp upload failed: ${uploadResponse.status} ${await uploadResponse.text().catch(() => "")}`);
    }

    return { absolutePath: tempUrl.absolutePath || absolutePath };
  }

  async download(absolutePath: string, destLocalPath: string): Promise<void> {
    await mkdir(dirname(destLocalPath), { recursive: true });
    await copyFile(resolve(absolutePath), destLocalPath);
  }

  private async createTempUploadUrl(
    baseUrl: string,
    accessToken: string,
    absolutePath: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<TempUploadUrlResponse> {
    const response = await fetch(`${this.normalizeBaseUrl(baseUrl)}/files/temp-upload-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ absolutePath, contentType, expiresInSeconds })
    });

    if (!response.ok) {
      throw new Error(`7router temp upload URL failed: ${response.status} ${await response.text().catch(() => "")}`);
    }

    return await response.json() as TempUploadUrlResponse;
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, "");
  }
}

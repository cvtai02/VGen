import { readFile, writeFile } from "node:fs/promises";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

export class SevenRouterStorageClient implements StorageClient {
  constructor(
    private readonly getSettings: () => { baseUrl: string; accessToken: string }
  ) {}

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const { baseUrl, accessToken } = this.getSettings();
    const absolutePath = input.destinationPath;

    const fileContent = await readFile(input.localPath);
    const contentBase64 = fileContent.toString("base64");

    const uploadResponse = await fetch(`${this.normalizeBaseUrl(baseUrl)}/files/upload`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ absolutePath, contentBase64, contentType: input.contentType })
    });

    if (!uploadResponse.ok) {
      throw new Error(`7router upload failed: ${uploadResponse.status}`);
    }

    const body = await uploadResponse.json().catch(() => ({})) as Record<string, unknown>;
    const cdnUrl = (body?.cdnUrl ?? (body?.file as Record<string, unknown>)?.cdnUrl) as string | undefined;

    return { absolutePath, cdnUrl };
  }

  async download(absolutePath: string, destLocalPath: string): Promise<void> {
    const { baseUrl, accessToken } = this.getSettings();

    const res = await fetch(`${this.normalizeBaseUrl(baseUrl)}/files/get`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ absolutePath })
    });

    if (!res.ok) throw new Error(`7router download failed: ${res.status}`);

    const data = (await res.json()) as { file: { contentBase64: string } };
    await writeFile(destLocalPath, Buffer.from(data.file.contentBase64, "base64"));
  }
}

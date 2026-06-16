import { readFile, writeFile } from "node:fs/promises";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

type SevenRouterFileResponse = {
  contentBase64?: unknown;
  base64?: unknown;
  content?: unknown;
  data?: unknown;
  cdnUrl?: unknown;
  downloadUrl?: unknown;
  url?: unknown;
  file?: {
    contentBase64?: unknown;
    base64?: unknown;
    content?: unknown;
    data?: unknown;
    cdnUrl?: unknown;
    downloadUrl?: unknown;
    url?: unknown;
  };
};

export class SevenRouterStorageClient implements StorageClient {
  constructor(
    private readonly getSettings: () => { baseUrl: string; accessToken: string }
  ) {}

  private normalizeBaseUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, "");
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  private getBase64Content(data: SevenRouterFileResponse): string | null {
    const candidates = [
      data.file?.contentBase64,
      data.contentBase64,
      data.file?.base64,
      data.base64,
      data.file?.content,
      data.content,
      data.file?.data,
      data.data
    ];

    const content = candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);

    return content ?? null;
  }

  private getDownloadUrl(data: SevenRouterFileResponse): string | null {
    const candidates = [
      data.file?.downloadUrl,
      data.downloadUrl,
      data.file?.cdnUrl,
      data.cdnUrl,
      data.file?.url,
      data.url
    ];

    return candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0) ?? null;
  }

  private describeResponseShape(data: SevenRouterFileResponse): string {
    const responseKeys = Object.keys(data).join(", ") || "none";
    const fileKeys = data.file && typeof data.file === "object" ? Object.keys(data.file).join(", ") || "none" : "none";
    return `Response keys: ${responseKeys}. File keys: ${fileKeys}.`;
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

    const data = (await res.json()) as SevenRouterFileResponse;
    const base64Content = this.getBase64Content(data);
    if (base64Content) {
      await writeFile(destLocalPath, Buffer.from(base64Content, "base64"));
      return;
    }

    const downloadUrl = this.getDownloadUrl(data);
    if (!downloadUrl) {
      throw new Error(`7router download response missing file content or URL. ${this.describeResponseShape(data)}`);
    }

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      const body = await fileResponse.text().catch(() => "");
      const hint = body.includes("<Message>Authorization</Message>")
        ? " 7router returned a private provider URL; deploy the signed downloadUrl change or make the object URL public."
        : "";
      throw new Error(`7router file URL download failed: ${fileResponse.status}.${hint}`);
    }

    await writeFile(destLocalPath, Buffer.from(await fileResponse.arrayBuffer()));
  }
}

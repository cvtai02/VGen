import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { StorageClient, StorageUploadInput, StorageUploadResult } from "../../../core/shared-kernel/contracts/storage-client.js";

export class LocalStorageClient implements StorageClient {
  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const absolutePath = resolve(input.destinationPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await copyFile(input.localPath, absolutePath);
    return { absolutePath };
  }

  async download(absolutePath: string, destLocalPath: string): Promise<void> {
    await mkdir(dirname(destLocalPath), { recursive: true });
    await copyFile(resolve(absolutePath), destLocalPath);
  }
}

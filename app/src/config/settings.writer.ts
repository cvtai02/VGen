import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { settingsSchema, type RuntimeSettings } from "./settings.schema.js";

export class SettingsWriter {
  async write(settingsPath: string, settings: RuntimeSettings): Promise<void> {
    const parsed = settingsSchema.parse(settings);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    const tempPath = `${settingsPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    await rename(tempPath, settingsPath);
  }
}

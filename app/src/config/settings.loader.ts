import { readFile } from "node:fs/promises";
import path from "node:path";
import { settingsSchema, type RuntimeSettings } from "./settings.schema.js";

const localSettingsPath = path.resolve("config/settings.local.json");
const exampleSettingsPath = path.resolve("src/config/settings.example.json");

export class SettingsLoader {
  async load(): Promise<RuntimeSettings> {
    const raw = await this.readLocalOrExample();
    return settingsSchema.parse(JSON.parse(raw));
  }

  getLocalSettingsPath(): string {
    return localSettingsPath;
  }

  private async readLocalOrExample(): Promise<string> {
    try {
      return await readFile(localSettingsPath, "utf8");
    } catch {
      return readFile(exampleSettingsPath, "utf8");
    }
  }
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { PrismaContext } from "../core/database/prisma-context.js";
import { runtimeSettingsSchema, defaultSettings, defaultTelegramSettings, type RuntimeSettings } from "./settings.schema.js";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encrypt(plain: string, secret: string): string {
  if (!plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, deriveKey(secret), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + iv.toString("base64") + ":" + tag.toString("base64") + ":" + ct.toString("base64");
}

function decrypt(value: string, secret: string): string {
  if (!value || !value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) return value;
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv(ALGO, deriveKey(secret), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return decipher.update(Buffer.from(ctB64, "base64")).toString("utf8") + decipher.final("utf8");
}

function encryptSecrets(s: RuntimeSettings, secret: string): RuntimeSettings {
  return {
    ...s,
    storage: { ...s.storage, accessToken: encrypt(s.storage.accessToken, secret) },
    tts: { ...s.tts, apiKey: encrypt(s.tts.apiKey, secret) },
    telegram: { ...(s.telegram ?? defaultTelegramSettings), botToken: encrypt((s.telegram ?? defaultTelegramSettings).botToken, secret) },
    mediaSource: { ...s.mediaSource, accessToken: encrypt(s.mediaSource.accessToken, secret) }
  };
}

function decryptSecrets(s: RuntimeSettings, secret: string): RuntimeSettings {
  return {
    ...s,
    storage: { ...s.storage, accessToken: decrypt(s.storage.accessToken, secret) },
    tts: { ...s.tts, apiKey: decrypt(s.tts.apiKey, secret) },
    telegram: { ...(s.telegram ?? defaultTelegramSettings), botToken: decrypt((s.telegram ?? defaultTelegramSettings).botToken, secret) },
    mediaSource: { ...s.mediaSource, accessToken: decrypt(s.mediaSource.accessToken, secret) }
  };
}

export class SettingsLoader {
  constructor(
    private readonly prisma: PrismaContext,
    private readonly encryptionKey: string
  ) {}

  async load(): Promise<RuntimeSettings> {
    const row = await this.prisma.systemSettings.findFirst({ where: { id: 1 } });
    if (!row) {
      await this.prisma.systemSettings.create({
        data: { id: 1, settingsJson: JSON.stringify(encryptSecrets(defaultSettings, this.encryptionKey)) }
      });
      return { ...defaultSettings };
    }
    try {
      const parsed = runtimeSettingsSchema.parse(JSON.parse(row.settingsJson));
      return decryptSecrets(parsed, this.encryptionKey);
    } catch {
      return { ...defaultSettings };
    }
  }

  async save(settings: RuntimeSettings): Promise<void> {
    const parsed = runtimeSettingsSchema.parse(settings);
    const toStore = encryptSecrets(parsed, this.encryptionKey);
    await this.prisma.systemSettings.upsert({
      where: { id: 1 },
      create: { id: 1, settingsJson: JSON.stringify(toStore) },
      update: { settingsJson: JSON.stringify(toStore) }
    });
  }
}

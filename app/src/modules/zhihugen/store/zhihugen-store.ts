import type { PrismaContext } from "../../../core/database/prisma-context.js";

export interface ZhihugenSettings {
  defaultOutputDirectory: string;
  defaultBackgroundVideoPath: string;
  defaultFps: number;
  defaultImageFit: "contain" | "cover";
  defaultResolution: string;
  defaultTtsModel: string;
}

export interface TtsModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

export interface ZhihugenStoreData {
  settings: ZhihugenSettings;
  ttsModels: TtsModel[];
  defaultTtsModelId: string;
}

const STORE_ID = 2;

const defaultData: ZhihugenStoreData = {
  settings: {
    defaultOutputDirectory: "CloudflareR2/cvtai105/minfect-entertainment/vgen/zhihugen",
    defaultBackgroundVideoPath: "CloudflareR2/cvtai105/minfect-entertainment/mp4/3m24s.mp4",
    defaultFps: 30,
    defaultImageFit: "contain",
    defaultResolution: "1080x1920",
    defaultTtsModel: "edge-tts/vi-VN-HoaiMyNeural"
  },
  ttsModels: [{ id: "edge-tts/vi-VN-HoaiMyNeural", name: "vi-VN-HoaiMy (Edge TTS)", provider: "edge-tts", enabled: true }],
  defaultTtsModelId: "edge-tts/vi-VN-HoaiMyNeural"
};

export class ZhihugenStore {
  private cache: ZhihugenStoreData | null = null;

  constructor(private readonly prisma: PrismaContext) {}

  async get(): Promise<ZhihugenStoreData> {
    if (this.cache) return structuredClone(this.cache);
    const row = await this.prisma.systemSettings.findFirst({ where: { id: STORE_ID } });
    if (!row) {
      this.cache = structuredClone(defaultData);
      return structuredClone(this.cache);
    }
    try {
      this.cache = JSON.parse(row.settingsJson) as ZhihugenStoreData;
      return structuredClone(this.cache);
    } catch {
      this.cache = structuredClone(defaultData);
      return structuredClone(this.cache);
    }
  }

  async save(data: ZhihugenStoreData): Promise<void> {
    await this.prisma.systemSettings.upsert({
      where: { id: STORE_ID },
      create: { id: STORE_ID, settingsJson: JSON.stringify(data) },
      update: { settingsJson: JSON.stringify(data) }
    });
    this.cache = data;
  }
}

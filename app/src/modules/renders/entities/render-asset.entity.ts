import { RenderAssetKind } from "../../../core/shared-kernel/enums/render-asset-kind.js";

export class RenderAssetEntity {
  constructor(
    public readonly id: string,
    public readonly kind: RenderAssetKind,
    public readonly source: string,
    public readonly url: string,
    public readonly localPath?: string
  ) {
    if (!url) {
      throw new Error("Render asset URL is required.");
    }
  }
}

import path from "node:path";

export function createRemotionOutputPath(outputDirectory: string, renderJobId: string): string {
  return path.resolve(outputDirectory, `${renderJobId}.mp4`);
}

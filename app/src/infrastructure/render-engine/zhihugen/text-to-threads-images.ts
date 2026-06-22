import sharp from "sharp";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

export interface TextBlock {
  text: string;
  author?: string;
  isMain?: boolean;
}

const CARD_WIDTH = 960;
const PADDING = 32;
const FONT_SIZE = 26;
const LINE_HEIGHT = 1.55;
const AUTHOR_FONT_SIZE = 24;
const BG_COLOR = "#101010";
const TEXT_COLOR = "#d0d0d0";
const AUTHOR_COLOR = "#ffffff";
const AVATAR_SIZE = 40;

function diceBearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

async function fetchAvatarDataUrl(seed: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(diceBearUrl(seed), { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/svg+xml";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine.length === 0) {
      lines.push("");
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (current.length + word.length + 1 > maxCharsPerLine && current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function buildCardSvg(block: TextBlock, avatarDataUrl?: string | null): string {
  const author = block.author ?? (block.isMain ? "EveryMinute" : "User");
  const avatar = author.charAt(0).toUpperCase();
  const contentX = PADDING + AVATAR_SIZE + 16;
  const contentWidth = CARD_WIDTH - contentX - PADDING;
  const charsPerLine = Math.floor(contentWidth / (FONT_SIZE * 0.52));

  const textLines = wrapText(block.text, charsPerLine);
  const authorY = PADDING + AUTHOR_FONT_SIZE;
  const textStartY = authorY + 12;
  const textBlockHeight = textLines.length * FONT_SIZE * LINE_HEIGHT;
  const totalHeight = Math.max(textStartY + textBlockHeight + PADDING + 8, AVATAR_SIZE + PADDING * 2);

  const tspans = textLines.map((line, i) => {
    const y = textStartY + i * FONT_SIZE * LINE_HEIGHT + FONT_SIZE;
    return `<tspan x="${contentX}" y="${y}">${escapeXml(line)}</tspan>`;
  }).join("");

  const cx = PADDING + AVATAR_SIZE / 2;
  const cy = PADDING + AVATAR_SIZE / 2;
  const r = AVATAR_SIZE / 2;

  const defs = avatarDataUrl ? `<defs><clipPath id="aclip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>` : "";
  const avatarSvg = avatarDataUrl
    ? `<image href="${avatarDataUrl}" x="${PADDING}" y="${PADDING}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" clip-path="url(#aclip)"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#333"/><text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="20" font-weight="700" fill="#fff">${escapeXml(avatar)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CARD_WIDTH}" height="${Math.ceil(totalHeight)}">
  ${defs}
  <rect width="${CARD_WIDTH}" height="${Math.ceil(totalHeight)}" fill="${BG_COLOR}" rx="16"/>
  ${avatarSvg}
  <text x="${contentX}" y="${authorY}" font-family="system-ui, -apple-system, sans-serif"
        font-size="${AUTHOR_FONT_SIZE}" font-weight="700" fill="${AUTHOR_COLOR}">${escapeXml(author)}</text>
  <text font-family="system-ui, -apple-system, sans-serif" font-size="${FONT_SIZE}" fill="${TEXT_COLOR}">${tspans}</text>
</svg>`;
}

export async function renderTextBlockToImage(block: TextBlock, outputPath: string, avatarDataUrl?: string | null): Promise<string> {
  const svg = buildCardSvg(block, avatarDataUrl);
  const svgBuffer = Buffer.from(svg, "utf-8");
  const pngBuffer = await sharp(svgBuffer, { density: 150 }).png().toBuffer();
  await writeFile(outputPath, pngBuffer);
  return outputPath;
}

export async function renderTextBlocksToImages(blocks: TextBlock[], workDir: string): Promise<string[]> {
  const avatarCache = new Map<string, string | null>();
  for (const block of blocks) {
    const seed = block.author?.trim() || (block.isMain ? "EveryMinute" : "User");
    if (!avatarCache.has(seed)) {
      avatarCache.set(seed, await fetchAvatarDataUrl(seed));
    }
  }

  const paths: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const seed = blocks[i].author?.trim() || (blocks[i].isMain ? "EveryMinute" : "User");
    const outputPath = join(workDir, `block_${i}.png`);
    await renderTextBlockToImage(blocks[i], outputPath, avatarCache.get(seed));
    paths.push(outputPath);
  }
  return paths;
}

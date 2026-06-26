import { execFile } from "node:child_process";
import { join } from "node:path";
import type { PostBlock, ScrapeThreadsResponseDto, ThreadsPost, ThreadsReply } from "../dtos/scrape-threads-response.dto.js";

interface RawScrapeResult {
  post: ThreadsPost;
  replies: ThreadsReply[];
}

function toBlocks(result: RawScrapeResult): PostBlock[] {
  return [
    {
      text: result.post.text,
      author: result.post.username,
      avatarUrl: result.post.profilePicUrl,
      score: result.post.likeCount,
      isMain: true,
      createdAt: result.post.takenAt,
      media: result.post.media,
    },
    ...result.replies.map((r) => ({
      text: r.text,
      author: r.username,
      avatarUrl: r.profilePicUrl,
      score: r.likeCount,
      isMain: false,
      createdAt: r.takenAt,
      media: r.media,
    })),
  ];
}

export class ScrapeThreadsPostUseCase {
  private readonly scriptPath: string;

  constructor(scriptsDirectory?: string) {
    this.scriptPath = join(scriptsDirectory ?? process.cwd(), "scripts", "threads-scrape.mjs");
  }

  execute(url: string): Promise<ScrapeThreadsResponseDto> {
    return new Promise((resolve, reject) => {
      execFile("node", [this.scriptPath, url], { timeout: 40_000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          let message = "Scrape failed";
          try {
            const parsed = JSON.parse(stderr.trim());
            if (parsed.error) message = parsed.error;
          } catch {
            if (err.killed) message = "Scrape timed out";
          }
          return reject(new Error(message));
        }

        try {
          const result = JSON.parse(stdout.trim()) as RawScrapeResult;
          const blocks = toBlocks(result);
          resolve({ blocks, post: result.post, replyCount: result.replies.length });
        } catch {
          reject(new Error("Failed to parse scrape output"));
        }
      });
    });
  }
}

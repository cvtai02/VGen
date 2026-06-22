import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { RenderEngine, RenderEngineInput, RenderEngineOutput } from "../../../core/shared-kernel/contracts/render-engine.js";
import type { ZhihugenJobRequest } from "../../../modules/zhihugen/store/job-helpers.js";

const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

// ── Process helpers ───────────────────────────────────────────────────────────

const PROCESS_TIMEOUT_MS = 10 * 60 * 1000;

function run(cmd: string, args: string[], timeoutMs = PROCESS_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "pipe" });
    let stderr = "";
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error(`${cmd} timed out after ${timeoutMs}ms`)); }, timeoutMs);
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function runCapture(cmd: string, args: string[], timeoutMs = PROCESS_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error(`${cmd} timed out after ${timeoutMs}ms`)); }, timeoutMs);
    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

// ── TTS ───────────────────────────────────────────────────────────────────────

async function generateTts(opts: {
  text: string;
  model: string;
  ttsBaseUrl: string;
  ttsApiKey: string;
  provider: string;
  voiceModel: string;
  outputPath: string;
}): Promise<void> {
  const { text, model, ttsBaseUrl, ttsApiKey, provider, voiceModel, outputPath } = opts;

  if (!text.trim()) {
    await run(FFMPEG, ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", "3", outputPath]);
    return;
  }

  const baseUrl = ttsBaseUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/api/tts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ttsApiKey}`
    },
    body: JSON.stringify({ provider, voiceModel: voiceModel || model, text })
  });

  if (!res.ok) {
    throw new Error(`TTS request failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.startsWith("application/json") || contentType.startsWith("text/")) {
    const body = await res.text().catch(() => "");
    throw new Error(`TTS returned non-audio response (${contentType}): ${body.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("TTS returned empty audio response");
  }
  await writeFile(outputPath, buffer);
}

// ── Audio duration ────────────────────────────────────────────────────────────

async function getAudioDuration(audioPath: string): Promise<number> {
  const out = await runCapture(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    audioPath
  ]);
  return parseFloat(out) || 3;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class ZhihugenRenderEngine implements RenderEngine {
  constructor(
    private readonly getTtsSettings: () => { baseUrl: string; apiKey: string; provider: string; voiceModel: string }
  ) {}

  async render(input: RenderEngineInput): Promise<RenderEngineOutput> {
    const req = input.request as ZhihugenJobRequest;
    const progress = input.onProgress;
    const { baseUrl: ttsBaseUrl, apiKey: ttsApiKey, provider, voiceModel } = this.getTtsSettings();
    const workDir = join(tmpdir(), `zhihugen-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });

    const [width, height] = req.resolution.split("x").map(Number);
    let bgVideoPath = req.backgroundVideoLocalPath!;
    const margin = 40;
    const innerW = width - margin * 2;
    const innerH = height - margin * 2;
    const n = req.images.length;

    // ── Step 1: Generate all TTS audio in parallel, then get durations ───────
    progress?.("tts", "started");
    const audioPaths = req.images.map((_, i) => join(workDir, `audio_${i}.mp3`));

    await Promise.all(
      audioPaths.map((audioPath, i) =>
        generateTts({
          text: req.scripts[i] ?? "",
          model: req.ttsModel,
          ttsBaseUrl,
          ttsApiKey,
          provider,
          voiceModel,
          outputPath: audioPath
        })
      )
    );

    const durations = await Promise.all(audioPaths.map(getAudioDuration));
    progress?.("tts", "completed");

    if (input.bgVideoReady) {
      bgVideoPath = await input.bgVideoReady;
    }

    const GAP = 0.5;     // silence between scenes (seconds)
    const WIPE = 0.1;    // wipe-to-left exit duration (seconds)
    const END_PAD = 1.0; // background-only tail (seconds)

    const totalAudioDuration = durations.reduce((a, b) => a + b, 0);
    const totalVideoDuration = totalAudioDuration + (n - 1) * GAP + END_PAD;

    // ── Step 2: Single-pass render — background plays continuously ────────────
    // Inputs: [0] bg (stream_loop -1), [1..n] images, [n+1..2n] audio files
    const args: string[] = ["-y", "-stream_loop", "-1", "-i", bgVideoPath];
    for (const imgPath of req.images) args.push("-loop", "1", "-i", imgPath);
    for (const audioPath of audioPaths) args.push("-i", audioPath);

    const filters: string[] = [];
    const imgScale = req.imageFit === "contain"
      ? `scale=${innerW}:${innerH}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`
      : `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;

    filters.push(`[0:v]scale=${width}:${height},setsar=1[bg]`);

    for (let i = 0; i < n; i++) {
      filters.push(`[${i + 1}:v]${imgScale}[img${i}]`);
    }

    // Chain overlays: image wipes left over last WIPE seconds, then disappears during GAP
    let t = 0;
    for (let i = 0; i < n; i++) {
      const start = t;
      const end = t + durations[i];
      const wipeStart = end - Math.min(WIPE, durations[i]);

      // x slides from initial position to -w over the wipe window
      const xExpr = req.imageFit === "contain"
        ? `if(lt(t,${wipeStart.toFixed(6)}),(W-w)/2,(W-w)/2-((t-${wipeStart.toFixed(6)})/${WIPE})*((W+w)/2))`
        : `if(lt(t,${wipeStart.toFixed(6)}),0,-((t-${wipeStart.toFixed(6)})/${WIPE})*W)`;
      const yExpr = req.imageFit === "contain" ? `H*0.20` : `0`;

      const base = i === 0 ? "bg" : `v${i - 1}`;
      const out = i === n - 1 ? "vout" : `v${i}`;
      filters.push(
        `[${base}][img${i}]overlay=x='${xExpr}':y=${yExpr}:enable='between(t,${start.toFixed(6)},${end.toFixed(6)})'[${out}]`
      );
      t += durations[i] + (i < n - 1 ? GAP : 0);
    }

    // Audio: interleave TTS clips with silence gaps + 1s end pad, then mix with bg audio at 30%
    const endSilTag = "sil_end";
    filters.push(`aevalsrc=0:c=stereo:s=44100:d=${END_PAD}[${endSilTag}]`);

    if (n === 1) {
      filters.push(`[${n + 1}:a][${endSilTag}]concat=n=2:v=0:a=1[ttsout]`);
    } else {
      for (let i = 0; i < n - 1; i++) {
        filters.push(`aevalsrc=0:c=stereo:s=44100:d=${GAP}[sil${i}]`);
      }
      const audioSegments = Array.from({ length: n }, (_, i) => {
        const parts = [`[${n + 1 + i}:a]`];
        if (i < n - 1) parts.push(`[sil${i}]`);
        return parts;
      }).flat();
      audioSegments.push(`[${endSilTag}]`);
      filters.push(`${audioSegments.join("")}concat=n=${2 * n}:v=0:a=1[ttsout]`);
    }

    // Mix TTS track with background video audio at 30% volume
    filters.push(`[0:a]volume=0.3[bgaudio]`);
    filters.push(`[ttsout][bgaudio]amix=inputs=2:duration=first:normalize=0[aout]`);
    const finalPath = join(workDir, "final.mp4");

    args.push(
      "-filter_complex", filters.join(";"),
      "-map", "[vout]",
      "-map", "[aout]",
      "-t", totalVideoDuration.toFixed(6),
      "-r", String(req.fps),
      "-c:v", "libx264", "-preset", "fast",
      "-c:a", "aac",
      finalPath
    );

    progress?.("rendering", "started");
    await run(FFMPEG, args);
    progress?.("rendering", "completed");

    return { localPath: finalPath, format: "mp4" };
  }
}

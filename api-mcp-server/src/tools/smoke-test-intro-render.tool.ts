import { FetchRenderClient } from "api-clients";

export async function smokeTestIntroRender(baseUrl: string) {
  const client = new FetchRenderClient(baseUrl);
  const result = await client.createIntroRenderJob({
    aspectRatio: "9:16",
    originVideo: { source: "url", url: "https://example.com/video.mp4" },
    introText: "Smoke test intro render.",
    introDurationSeconds: 3,
    backgroundMusic: { source: "none" }
  });
  return {
    tested: "create intro render job",
    route: "POST /api/renders/intro",
    renderType: "Intro",
    pass: result.status === "Pending",
    renderJobId: result.renderJobId
  };
}

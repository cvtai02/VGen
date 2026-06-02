import { FetchRenderClient } from "api-clients";

export async function smokeTestCompositeRender(baseUrl: string) {
  const client = new FetchRenderClient(baseUrl);
  const result = await client.createCompositeRenderJob({
    aspectRatio: "9:16",
    backgroundVideo: { source: "default" },
    backgroundMusic: { source: "default" },
    images: [{ url: "https://example.com/image.png", scriptText: "Smoke test composite render." }],
    tts: { enabled: true }
  });
  return {
    tested: "create composite render job",
    route: "POST /api/renders/composite",
    renderType: "Composite",
    pass: result.status === "Pending",
    renderJobId: result.renderJobId
  };
}

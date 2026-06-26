import type { FastifyInstance } from "fastify";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { ScrapeThreadsPostUseCase } from "../usecases/scrape-threads-post.usecase.js";
import type { ScrapeThreadsRequestDto } from "../dtos/scrape-threads-request.dto.js";

export async function registerScrapeThreadsApi(app: FastifyInstance, scrapeUseCase: ScrapeThreadsPostUseCase): Promise<void> {
  app.post<{ Body: ScrapeThreadsRequestDto }>("/api/threads/scrape", async (request, reply) => {
    const { url } = request.body ?? {};

    if (!url || !url.includes("threads.")) {
      return reply.code(400).send(apiError(400, "Bad Request", "Missing or invalid Threads URL."));
    }

    try {
      const result = await scrapeUseCase.execute(url);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.code(500).send(apiError(500, "Internal Server Error", message));
    }
  });
}

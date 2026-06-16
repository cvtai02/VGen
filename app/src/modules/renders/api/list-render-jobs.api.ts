import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { ListRenderJobsUseCase } from "../usecases/list-render-jobs.usecase.js";

export async function registerListRenderJobsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Querystring: { status?: string; type?: string; limit?: string; cursor?: string } }>("/api/renders", async (request) => {
    const useCase = new ListRenderJobsUseCase(container.prisma);
    const rawLimit = request.query.limit ? Number(request.query.limit) : undefined;
    const limit = rawLimit && rawLimit > 0 ? Math.min(rawLimit, 200) : undefined;
    return useCase.execute({
      status: request.query.status,
      type: request.query.type,
      limit,
      cursor: request.query.cursor
    });
  });
}

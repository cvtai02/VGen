import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import { GetRenderJobUseCase } from "../usecases/get-render-job.usecase.js";

export async function registerGetRenderJobApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get<{ Params: { renderJobId: string } }>("/api/renders/:renderJobId", async (request, reply) => {
    const useCase = new GetRenderJobUseCase(container.prisma);
    const result = await useCase.execute({ renderJobId: request.params.renderJobId });
    if (!result) {
      return reply.code(404).send(apiError(404, "Not Found", "Render job not found."));
    }
    return result;
  });
}

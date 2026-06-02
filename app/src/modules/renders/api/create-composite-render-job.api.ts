import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { CreateCompositeRenderJobRequestDto } from "../dtos/create-composite-render-job-request.dto.js";
import { CreateCompositeRenderJobUseCase } from "../usecases/create-composite-render-job.usecase.js";

export async function registerCreateCompositeRenderJobApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Body: CreateCompositeRenderJobRequestDto }>("/api/renders/composite", async (request, reply) => {
    const useCase = new CreateCompositeRenderJobUseCase(
      container.prisma,
      container.queue,
      container.idGenerator,
      container.settings.app.publicBaseUrl
    );
    const response = await useCase.execute(request.body);
    return reply.code(202).send(response);
  });
}

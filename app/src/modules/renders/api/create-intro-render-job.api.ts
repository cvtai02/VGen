import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { CreateIntroRenderJobRequestDto } from "../dtos/create-intro-render-job-request.dto.js";
import { CreateIntroRenderJobUseCase } from "../usecases/create-intro-render-job.usecase.js";

export async function registerCreateIntroRenderJobApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Body: CreateIntroRenderJobRequestDto }>("/api/renders/intro", async (request, reply) => {
    const useCase = new CreateIntroRenderJobUseCase(
      container.prisma,
      container.queue,
      container.idGenerator,
      container.settings.app.publicBaseUrl
    );
    const response = await useCase.execute(request.body);
    return reply.code(202).send(response);
  });
}

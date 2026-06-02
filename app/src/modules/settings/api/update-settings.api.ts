import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import type { RuntimeSettings } from "../../../config/settings.schema.js";
import { UpdateSettingsUseCase } from "../usecases/update-settings.usecase.js";

export async function registerUpdateSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.put<{ Body: RuntimeSettings }>("/api/settings", async (request, reply) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
    const useCase = new UpdateSettingsUseCase(container.settingsStore);
    try {
      return await useCase.execute({ settings: request.body, adminAccessToken: token });
    } catch (error) {
      return reply.code(401).send({ message: error instanceof Error ? error.message : "Unauthorized." });
    }
  });
}

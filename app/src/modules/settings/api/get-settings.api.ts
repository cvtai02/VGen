import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { GetSettingsUseCase } from "../usecases/get-settings.usecase.js";

export async function registerGetSettingsApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.get("/api/settings", async () => {
    const useCase = new GetSettingsUseCase(container.settingsStore);
    return useCase.execute();
  });
}

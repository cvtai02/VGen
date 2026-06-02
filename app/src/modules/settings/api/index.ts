import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerGetSettingsApi } from "./get-settings.api.js";
import { registerUpdateSettingsApi } from "./update-settings.api.js";

export async function registerSettingsApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerGetSettingsApi(app, container);
  await registerUpdateSettingsApi(app, container);
}

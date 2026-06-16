import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { registerLoginApi } from "./login.api.js";

export async function registerAuthApis(app: FastifyInstance, container: AppContainer): Promise<void> {
  await registerLoginApi(app, container);
}

import type { FastifyInstance } from "fastify";
import type { AppContainer } from "../../../container.js";
import { apiError } from "../../../core/shared-kernel/api-error.js";
import type { LoginRequestDto } from "../dtos/login-request.dto.js";
import type { LoginResponseDto } from "../dtos/login-response.dto.js";

export async function registerLoginApi(app: FastifyInstance, container: AppContainer): Promise<void> {
  app.post<{ Body: LoginRequestDto; Reply: LoginResponseDto | { statusCode: number; error: string; message: string } }>(
    "/api/auth/login",
    async (request, reply) => {
      const token = container.createAdminAccessTokenUseCase.execute(request.body?.systemSecret ?? "");
      if (!token) {
        return reply.code(401).send(apiError(401, "Unauthorized", "Invalid system secret."));
      }

      return {
        accessToken: token,
        tokenType: "Bearer"
      };
    }
  );
}

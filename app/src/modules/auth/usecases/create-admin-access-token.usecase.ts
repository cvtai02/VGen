import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export class CreateAdminAccessTokenUseCase {
  constructor(
    private readonly systemSecret: string,
    private readonly prisma: PrismaClient
  ) {}

  async execute(systemSecret: string): Promise<string | null> {
    if (systemSecret !== this.systemSecret) return null;

    const token = randomUUID();
    await this.prisma.adminToken.create({ data: { token } });
    return token;
  }
}

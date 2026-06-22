import type { PrismaClient } from "@prisma/client";

export class VerifyAdminAccessTokenUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly systemToken: string
  ) {}

  async execute(authorizationHeader: string | undefined): Promise<boolean> {
    if (!authorizationHeader?.startsWith("Bearer ")) return false;
    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (!token.length) return false;
    if (token === this.systemToken) return true;
    const row = await this.prisma.adminToken.findUnique({ where: { token } });
    return row !== null;
  }
}

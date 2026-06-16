import { randomUUID } from "node:crypto";

export class CreateAdminAccessTokenUseCase {
  constructor(
    private readonly systemSecret: string,
    private readonly issuedTokens: Set<string>
  ) {}

  execute(systemSecret: string): string | null {
    if (systemSecret !== this.systemSecret) return null;

    const token = randomUUID();
    this.issuedTokens.add(token);
    return token;
  }
}

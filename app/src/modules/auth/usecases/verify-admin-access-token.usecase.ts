export class VerifyAdminAccessTokenUseCase {
  constructor(
    private readonly issuedTokens: Set<string>,
    private readonly systemToken: string
  ) {}

  execute(authorizationHeader: string | undefined): boolean {
    if (!authorizationHeader?.startsWith("Bearer ")) return false;
    const token = authorizationHeader.slice("Bearer ".length).trim();
    return token.length > 0 && (this.issuedTokens.has(token) || token === this.systemToken);
  }
}

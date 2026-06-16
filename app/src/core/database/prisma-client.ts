import { PrismaClient } from "@prisma/client";

function withSslMode(connectionString: string | undefined): string | undefined {
  if (!connectionString || process.env.DATABASE_SSL !== "require") return connectionString;
  const url = new URL(connectionString);
  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

process.env.DATABASE_CONNECTION_STRING = withSslMode(process.env.DATABASE_CONNECTION_STRING);

export const prismaClient = new PrismaClient();

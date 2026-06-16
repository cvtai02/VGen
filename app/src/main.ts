import "dotenv/config";
import { createContainer } from "./container.js";
import { createServer } from "./server.js";

const container = await createContainer();
const server = await createServer(container);
const port = Number(process.env.PORT ?? 3000);
await server.listen({ port, host: "0.0.0.0" });

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  await server.close();
  await container.prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

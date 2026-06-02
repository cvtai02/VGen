import { createContainer } from "./container.js";
import { createServer } from "./server.js";

const container = await createContainer();
const server = await createServer(container);
const port = Number(process.env.PORT ?? 3000);
await server.listen({ port, host: "0.0.0.0" });

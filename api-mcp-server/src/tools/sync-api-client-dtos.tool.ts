import { spawn } from "node:child_process";

export async function syncApiClientDtos() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", ["--filter", "api-clients", "sync:dtos"], { stdio: "inherit", shell: true });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`DTO sync failed with ${code}`))));
  });
  return {
    tested: "DTO sync",
    route: "local script",
    pass: true
  };
}

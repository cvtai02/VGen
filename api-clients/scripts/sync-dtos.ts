import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";

const moduleRoots = ["renders", "settings"];
const appModulesPath = path.resolve("../app/src/modules");
const clientDtosPath = path.resolve("src/dtos");

for (const moduleName of moduleRoots) {
  const sourceDir = path.join(appModulesPath, moduleName, "dtos");
  const targetDir = path.join(clientDtosPath, moduleName);
  await mkdir(targetDir, { recursive: true });
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".ts"));
  for (const file of files) {
    await copyFile(path.join(sourceDir, file), path.join(targetDir, file));
  }
}

console.log("DTO sync completed.");

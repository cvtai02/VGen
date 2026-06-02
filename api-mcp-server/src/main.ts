import { smokeTestCompositeRender } from "./tools/smoke-test-composite-render.tool.js";
import { smokeTestIntroRender } from "./tools/smoke-test-intro-render.tool.js";
import { validateSettings } from "./tools/validate-settings.tool.js";

const baseUrl = process.env.VGEN_API_BASE_URL ?? "http://localhost:3000";

const results = [];
for (const test of [validateSettings, smokeTestCompositeRender, smokeTestIntroRender]) {
  try {
    results.push(await test(baseUrl));
  } catch (error) {
    results.push({
      tested: test.name,
      route: "unknown",
      pass: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.pass)) {
  process.exitCode = 1;
}

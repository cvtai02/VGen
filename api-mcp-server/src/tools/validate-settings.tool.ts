import { FetchSettingsClient } from "api-clients";

export async function validateSettings(baseUrl: string) {
  const client = new FetchSettingsClient(baseUrl);
  const settings = await client.getSettings();
  return {
    tested: "settings validation",
    route: "GET /api/settings",
    pass: Boolean(settings.app.baseUrl)
  };
}

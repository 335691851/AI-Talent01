import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] ??= value;
  }
}

loadLocalEnv();

const e2eBaseUrl = process.env.E2E_APP_URL ?? process.env.APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eBaseUrl,
    extraHTTPHeaders: {
      "x-ai-demo-mode": "true",
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
  webServer: {
    command: "node ./node_modules/next/dist/bin/next dev --turbopack",
    url: e2eBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: e2eBaseUrl,
      AI_FORCE_DEMO_RESPONSES: "true",
    },
  },
});

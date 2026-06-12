import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    // Evita errores de SSL en dev
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: [
    // 1. Mock API — debe arrancar antes que el portal
    {
      command: "node e2e/mock-api.cjs",
      port: 9001,
      reuseExistingServer: false,
      timeout: 10_000,
    },
    // 2. Next.js en modo test — .env.local NO se carga con NODE_ENV=test.
    //    .env.test sí se carga → NEXT_PUBLIC_API_URL apunta al mock en 9001.
    {
      command: "npx cross-env NODE_ENV=test npm run dev",
      port: 3001,
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4322',
    browserName: 'chromium',
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4322 --ignore-lock --mode test',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
    env: {
      ASTRO_TELEMETRY_DISABLED: '1',
      // Mantener el proceso bajo control de Playwright en entornos de agentes.
      ASTRO_DEV_BACKGROUND: '1',
      CATALOG_E2E: '1',
      // Solo pruebas con respuestas interceptadas. Nunca son credenciales reales.
      PUBLIC_SUPABASE_URL: 'https://catalog-test.supabase.co',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
    },
  },
});

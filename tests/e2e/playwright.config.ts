import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas automatizadas de TechStore.
 *
 * BASE_URL apunta al frontend: en local http://localhost:5173 (Vite redirige /api
 * al backend en el puerto 5000); en Azure, la URL del App Service.
 *
 * Las pruebas comparten una base de datos, por eso corren en serie (1 worker) y
 * cada archivo restablece los datos semilla con POST /api/testing/reset.
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './global-setup.ts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    viewport: { width: 1366, height: 900 },
    // Evidencias para el informe QA03
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    // RNF-13: el flujo de compra se repite en Firefox y Edge
    { name: 'firefox', grep: /@compat/, use: { ...devices['Desktop Firefox'], viewport: { width: 1366, height: 900 } } },
    { name: 'edge', grep: /@compat/, use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1366, height: 900 } } },
  ],
});

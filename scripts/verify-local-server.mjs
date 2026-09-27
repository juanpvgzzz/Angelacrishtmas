import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  for (const path of ['/', '/catalogo/', '/navidad/', '/munecas-de-trapo/']) {
    const response = await page.goto(baseURL + path);
    assert.equal(response.status(), 200, path);
    await expect(page.locator('[data-live-catalog], [data-live-collections]').first().locator('.product-grid, .collection-grid, .empty-state')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
    console.log(`OK ${path}: pagina y datos reales cargados`);
  }
  await page.goto(baseURL + '/admin/');
  await expect(page).toHaveURL(baseURL + '/admin/login/');
  await expect(page.getByRole('heading', { name: 'Panel de ÁMELA' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/local-admin-login.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('OK /admin/: redirige al login, formulario operativo, sin errores de consola. No se uso una contraseña humana.');
} finally {
  await browser.close();
}

// Verificación de lectura sobre el build local y los servicios públicos reales.
// No utiliza credenciales administrativas ni escribe registros u objetos remotos.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { preview } from 'astro';
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile();
await mkdir('test-results', { recursive: true });
const db = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const rows = {};
for (const table of ['categories', 'products']) {
  const result = await db.from(table).select('*');
  assert.ifError(result.error);
  assert.ok(result.data.every(row => row.active), `${table}: solo filas activas para visitantes`);
  rows[table] = result.data;
  console.log(`${table}: lectura pública real correcta (${result.data.length} filas activas)`);
}
const photoPaths = [...rows.categories.map(c => c.image_path), ...rows.products.flatMap(p => p.images.map(im => im.path))].filter(path => path && !path.startsWith('/images/'));
for (const path of new Set(photoPaths)) {
  const response = await fetch(db.storage.from('product-images').getPublicUrl(path).data.publicUrl);
  assert.ok(response.ok && response.headers.get('content-type')?.startsWith('image/'), 'Fotografía de Storage accesible');
}
console.log(`Fotografías reales en Storage verificadas: ${new Set(photoPaths).size}`);
const auth = await fetch(`${process.env.PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY } });
assert.ok(auth.ok, 'Auth responde');
console.log('Auth real responde; login con credenciales humanas no ejecutado.');

const server = await preview({ server: { host: '127.0.0.1', port: 4324 }, logLevel: 'error' });
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:4324/');
    await expect(page).toHaveTitle('ÁMELA | Handmade with Love');
    await expect(page.locator('.collection-card')).toHaveCount(rows.categories.length, { timeout: 15000 });
    await expect(page.locator('.editorial-brand')).toHaveText('ÁMELA');
    if (await page.locator('[data-live-seasonal]').isVisible()) {
      await page.locator('[data-live-seasonal]').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('[data-live-seasonal] img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    for (const img of await page.locator('main img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `test-results/amela-live-${width}.png`, fullPage: true });
  }
  if (rows.products.length) {
    await page.goto('http://127.0.0.1:4324/producto/?slug=' + encodeURIComponent(rows.products[0].slug));
    await expect(page.locator('#product-title')).toHaveText(rows.products[0].name);
    await expect(page.locator('.detail-purchase')).toContainText('50%');
  }
  await page.goto('http://127.0.0.1:4324/producto/?slug=amela-verificacion-inexistente');
  await expect(page.getByRole('heading', { name: 'Producto no disponible' })).toBeVisible();
  await page.goto('http://127.0.0.1:4324/admin/');
  await expect(page).toHaveURL(/admin\/login/);
  await expect(page.getByRole('heading', { name: 'Panel de ÁMELA' })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('Build real: portada móvil/escritorio, imágenes disponibles, ficha, inexistentes, protección administrativa y consola correctos.');
  console.log(process.env.PUBLIC_WHATSAPP_NUMBER ? 'WhatsApp: número configurado (valor omitido).' : 'Pendiente: no hay número real configurado para WhatsApp.');
} finally {
  await browser?.close();
  await server.stop();
}

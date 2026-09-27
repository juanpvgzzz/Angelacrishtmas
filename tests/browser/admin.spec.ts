import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSupabase, login } from './supabase-fixture';

test('buscar, filtrar y paginar sin nuevas consultas al catálogo', async ({ page }) => {
  const state = await mockSupabase(page);
  for (let i = 0; i < 20; i++) state.products.push({ ...state.products[0], id: `extra-${i}`, name: `Creación ${i}`, slug: `creacion-${i}`, active: i % 2 === 0 });
  let reads = 0;
  page.on('request', request => { if (request.method() === 'GET' && /rest\/v1\/(products|categories)/.test(request.url())) reads++; });
  await login(page);
  await expect(page.locator('#product-list .admin-row')).toHaveCount(12);
  const initialReads = reads;
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('#page-info')).toHaveText('Página 2 de 3');
  await page.getByLabel('Buscar productos').fill('creacion 19');
  await expect(page.locator('#product-list .admin-row')).toHaveCount(1);
  await expect(page.locator('#product-list')).toContainText('Creación 19');
  await page.getByLabel('Estado', { exact: true }).selectOption('active');
  await expect(page.locator('#product-list')).toContainText('No encontramos coincidencias');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.locator('#product-list .admin-row')).toHaveCount(12);
  await expect(page.locator('#page-info')).toHaveText('Página 1 de 3');
  expect(reads).toBe(initialReads);
});

test('fotografías grandes se optimizan; archivos dañados se rechazan antes de subir', async ({ page }) => {
  const state = await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Imagen optimizada');
  await page.getByLabel('Descripción corta', { exact: true }).fill('Pieza hecha a mano');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption(state.categories[0].id);
  await page.locator('#photo-input').setInputFiles({ name: 'dañada.png', mimeType: 'image/png', buffer: Buffer.from('no es una imagen') });
  await expect(page.locator('#editor-status')).toContainText('No pudimos abrir');
  expect(state.uploads).toHaveLength(0);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1800;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#8b2441'; ctx.fillRect(0, 0, 2400, 1800);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#photo-input').setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.photo-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  const product = state.products.find(p => p.name === 'Imagen optimizada')!;
  expect(product.images[0]).toMatchObject({ width: 1600, height: 1200 });
  expect(product.images[0].path).toMatch(/\.webp$/);
  expect(product.active).toBe(false);
  expect(state.uploads).toHaveLength(1);
});

test('cancelar protege cambios y los nombres se muestran como texto', async ({ page }) => {
  const state = await mockSupabase(page);
  state.products[0].name = '<img src=x onerror=alert(1)>';
  await login(page);
  const row = page.locator('#product-list .admin-row').first();
  await expect(row.locator('h3')).toHaveText(state.products[0].name);
  await expect(row.locator('h3 img')).toHaveCount(0);
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Cambio pendiente');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('#editor')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  expect(state.products[0].name).toContain('<img');
});

test('panel accesible y sin desbordamientos; capturas móvil y escritorio', async ({ page }) => {
  await mockSupabase(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page);
  await expect(page.locator('#admin-panel')).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.locator('#category-list').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `test-results/admin-dashboard-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('mostrar contraseña y reintentar después de una lectura fallida', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/admin/login/');
  await page.getByRole('button', { name: 'Mostrar', exact: true }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar', exact: true }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'password');
  let fail = true;
  await page.route('**/rest/v1/products?*', route => fail ? route.fulfill({ status: 500, body: '{"message":"Test error"}', contentType: 'application/json' }) : route.fallback());
  await login(page);
  await expect(page.locator('#retry-load')).toBeVisible();
  await expect(page.locator('#admin-panel')).toBeHidden();
  fail = false;
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
  await expect(page.locator('#admin-panel')).toBeVisible();
});

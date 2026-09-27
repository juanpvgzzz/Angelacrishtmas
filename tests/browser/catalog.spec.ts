import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSupabase, login } from './supabase-fixture';

test('catálogo, galería, filtros, ficha nueva y WhatsApp', async ({ page }) => {
  const state = await mockSupabase(page);
  await page.goto('/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  const imageUrl = new URL(state.products[0].images[0].path, 'http://127.0.0.1:4322').href;
  const expectedQuote = 'https://wa.me/573046583246?text=' + encodeURIComponent('Hola, quiero cotizar el producto Papá Noel de Navidad de ÁMELA. Quisiera conocer su precio, disponibilidad y opciones de personalización.\n\nFoto del producto: ' + imageUrl);
  await page.locator('.product-card').first().locator('.product-detail-link').click();
  await expect(page).toHaveURL(/producto\/\?slug=papa-noel/);
  await expect(page.getByRole('heading', { name: 'Papá Noel de Navidad', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver imagen 2' }).click();
  await expect(page.locator('#main-product-image')).toHaveAttribute('src', '/images/placeholders/santa-detail.svg');
  await expect(page.locator('.detail-purchase')).toContainText('50%');
  await expect(page.locator('.product-detail-copy').getByRole('link', { name: 'Cotizar por WhatsApp: Papá Noel de Navidad', exact: true })).toHaveAttribute('href', expectedQuote);
  state.products[0].slug = 'producto-nuevo-sin-build';
  await page.goto('/producto/?slug=producto-nuevo-sin-build');
  await expect(page.locator('#product-title')).toHaveText('Papá Noel de Navidad');
  await page.goto('/catalogo/?categoria=decoracion-para-el-hogar');
  await expect(page.getByRole('heading', { name: 'No encontramos creaciones en esta selección' })).toBeVisible();
});

test('ocultos, categorías ocultas, agotados e inexistentes', async ({ page }) => {
  const state = await mockSupabase(page);
  state.products[0].active = false;
  state.categories[1].active = false;
  for (const slug of ['papa-noel-de-navidad', 'angelito-de-los-deseos', 'no-existe']) {
    await page.goto('/producto/?slug=' + slug);
    await expect(page.getByRole('heading', { name: 'Producto no disponible' })).toBeVisible();
    await expect(page.locator('.product-detail')).toHaveCount(0);
  }
  await page.goto('/producto/?slug=gnomo-copito');
  await expect(page.locator('.detail-status')).toContainText('Agotado');
});

test('fallos de conexión no publican el respaldo de demostración', async ({ page }) => {
  await page.route('https://catalog-test.supabase.co/**', route => route.abort());
  await page.goto('/catalogo/');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar', { timeout: 15000 });
  await expect(page.locator('.product-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Volver a intentar' })).toBeVisible();
});

test('visitante redirigido y cuenta sin membresía rechazada', async ({ page }) => {
  await mockSupabase(page, false);
  await page.goto('/admin/');
  await expect(page).toHaveURL(/admin\/login/);
  await login(page);
  await expect(page.getByRole('status')).toContainText('no tiene acceso administrativo');
  await expect(page.locator('#admin-panel')).toHaveCount(0);
});

test('administradora crea, edita, oculta y elimina categorías', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await expect(page.locator('#admin-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Categoría de prueba');
  await expect(page.getByLabel('Slug', { exact: true })).toHaveValue('categoria-de-prueba');
  await page.getByLabel('Orden', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  const row = page.locator('#category-list .admin-row').filter({ hasText: 'Categoría de prueba' });
  await expect(row).toContainText('Oculto');
  await row.getByRole('button', { name: 'Activar', exact: true }).click();
  await expect(row).toContainText('Activo');
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Descripción completa').fill('Descripción actualizada');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.locator('#category-list .admin-row').first().getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.locator('#admin-status')).toContainText('con productos');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/admin\/login/);
});

const png = { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64') };
test('productos: fotografías, orden, principal, reemplazo y eliminación', async ({ page }) => {
  const state = await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Producto de prueba');
  await page.getByLabel('Descripción corta', { exact: true }).fill('Hecho a mano');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption(state.categories[0].id);
  await page.getByLabel('Precio en pesos colombianos').fill('25000');
  await page.getByLabel('Visible en el catálogo').check();
  await page.locator('#photo-input').setInputFiles([png, { ...png, name: 'otra.png' }]);
  await expect(page.locator('.photo-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Hacer principal' }).click();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  expect(state.uploads).toHaveLength(2);
  const row = page.locator('#product-list .admin-row').filter({ hasText: 'Producto de prueba' });
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByRole('button', { name: 'Retirar / reemplazar' }).first().click();
  await page.locator('#photo-input').setInputFiles(png);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  expect(state.uploads).toHaveLength(3);
  expect(state.removed).toHaveLength(1);
  page.once('dialog', dialog => dialog.accept());
  await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(state.removed).toHaveLength(3);
});

test('guardado fallido limpia fotografías recién subidas y muestra slug duplicado', async ({ page }) => {
  const state = await mockSupabase(page);
  await login(page);
  await page.locator('#product-list .admin-row').first().getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#photo-input').setInputFiles(png);
  state.failSave = true;
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor-status')).toContainText('slug ya existe');
  expect(state.removed).toEqual(state.uploads);
  await expect(page.locator('#editor')).toBeVisible();
});

test('escritorio y celular: accesibilidad, consola, diseño y recursos originales', async ({ page }) => {
  await mockSupabase(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/catalogo/', '/producto/?slug=papa-noel-de-navidad', '/admin/login/']) {
      await page.goto(path);
      if (!path.includes('admin')) await expect(page.locator('.product-card').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path + ' ' + width).toBe(true);
      if (width === 390) {
      // Audit settled colors, rather than an intermediate frame of a fade.
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    }
    }
  }
  await page.goto('/');
  await expect(page.locator('.catalog-banner')).toHaveCount(3);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: 'test-results/supabase-catalog-' + width + '.png', fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('panel y formulario accesibles en celular y escritorio', async ({ page }) => {
  await mockSupabase(page);
  await login(page);
  await expect(page.locator('#admin-panel')).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/admin-form-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.locator('#editor')).not.toBeVisible();
  }
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSupabase, login } from './supabase-fixture';

test('secciones independientes, enlaces de categoria y ficha', async ({ page }) => {
  const state = await mockSupabase(page);
  state.categories[0].section = 'munecas-de-trapo';
  const dolls = state.products.filter(product => product.category_id === state.categories[0].id);
  for (const width of [320, 390, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/munecas-de-trapo/');
    await expect(page.locator('.product-card')).toHaveCount(dolls.length);
    await expect(page.locator('.section-tabs [aria-current]')).toHaveText('Muñecas de trapo');
    await expect(page.locator('.catalog-refinements select option')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      // Audit settled colors, rather than an intermediate frame of a fade.
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    }
    await page.screenshot({ path: `test-results/sections-dolls-${width}.png`, fullPage: true });
  }
  await page.getByLabel('Categoría del catálogo', { exact: true }).selectOption(state.categories[0].slug);
  await expect(page).toHaveURL(/munecas-de-trapo\/\?categoria=/);
  await page.locator('.product-detail-link').first().click();
  await expect(page.locator('[data-live-product] .breadcrumbs').getByRole('link', { name: 'Muñecas de trapo', exact: true })).toHaveAttribute('href', '/munecas-de-trapo/');
  await page.goto('/navidad/');
  await expect(page.locator('.product-card')).toHaveCount(state.products.length - dolls.length);
  await page.goto('/navidad/?categoria=' + state.categories[0].slug);
  await expect(page.locator('.product-card')).toHaveCount(0);
  await page.goto('/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(state.products.length);
});

test('administrar munecas con fotos y cambiar un producto de seccion', async ({ page }) => {
  const state = await mockSupabase(page);
  await login(page);
  await page.getByLabel('Sección del catálogo', { exact: true }).selectOption('munecas-de-trapo');
  await expect(page.locator('#category-list .admin-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Crear categoría', exact: true }).click();
  await expect(page.getByLabel('Sección', { exact: true })).toHaveValue('munecas-de-trapo');
  await page.getByLabel('Nombre', { exact: true }).fill('Muñecas artesanales');
  await page.getByLabel('Visible en el catálogo').check();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  const category = state.categories.find(item => item.slug === 'munecas-artesanales')!;
  expect(category.section).toBe('munecas-de-trapo');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Categoría', exact: true }).locator('option')).toHaveCount(2);
  await page.getByLabel('Nombre', { exact: true }).fill('Muñeca de prueba');
  await page.getByLabel('Descripción corta', { exact: true }).fill('Muñeca artesanal');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption(category.id);
  await page.getByLabel('Precio en pesos colombianos').fill('80000');
  await page.getByLabel('Visible en el catálogo').check();
  await page.locator('#photo-input').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64') });
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  const row = page.locator('#product-list .admin-row').filter({ hasText: 'Muñeca de prueba' });
  await expect(row).toContainText('Muñecas de trapo');
  expect(state.uploads).toHaveLength(1);
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Sección', { exact: true }).selectOption('navidad');
  await expect(page.getByRole('combobox', { name: 'Categoría', exact: true })).toHaveValue('');
  await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption(state.categories[0].id);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#editor')).not.toBeVisible();
  await expect(row).toHaveCount(0);
  await page.getByLabel('Sección del catálogo', { exact: true }).selectOption('navidad');
  await expect(page.locator('#product-list')).toContainText('Muñeca de prueba');
});

import { test, expect } from '@playwright/test';
import { mockSupabase, login } from './supabase-fixture';
import { catalogTextFields, catalogToggleFields } from '../../src/config/catalog-settings';

test('contenido: todos los textos, persistencia, vista previa y controles públicos', async ({ page }) => {
  const state = await mockSupabase(page);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await login(page);
  await page.getByRole('button', { name: 'Editar textos y filtros' }).click();
  const form = page.locator('#catalog-content-form');
  await expect(form.locator('[name=title]')).toBeEnabled();
  for (const field of catalogTextFields) await form.locator(`[name=${field.key}]`).fill(`Nuevo ${field.key}`);
  await expect(form.locator('[data-preview=title]')).toHaveText('Nuevo title');
  for (const field of catalogToggleFields) await form.locator(`[name=${field.key}]`).uncheck();
  await form.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#catalog-content-status')).toContainText('Cambios guardados');
  await page.reload();
  await page.getByRole('button', { name: 'Editar textos y filtros' }).click();
  for (const field of catalogTextFields) await expect(form.locator(`[name=${field.key}]`)).toHaveValue(`Nuevo ${field.key}`);
  await page.goto('/catalogo/');
  await expect(page.locator('#catalog-title')).toHaveText('Nuevo title');
  await expect(page.locator('[data-catalog-eyebrow]')).toHaveText('Nuevo eyebrow');
  await expect(page.locator('[data-catalog-description]')).toHaveText('Nuevo description');
  await expect(page.locator('.catalog-groups')).toBeHidden();
  await expect(page.locator('.category-select')).toBeHidden();
  await expect(page.locator('.personalized-filter')).toBeHidden();
  for (const field of catalogToggleFields) state.catalog_section_settings[0][field.key] = true;
  await page.reload();
  await expect(page.locator('[data-group=""]')).toHaveText('Nuevo all_button_label');
  await expect(page.locator('.category-select')).toContainText('Nuevo category_label');
  await expect(page.locator('select option').first()).toHaveText('Nuevo all_categories_label');
  await expect(page.locator('.personalized-filter')).toContainText('Nuevo customizable_label');
  expect(errors).toEqual([]);
});

test('categorías dinámicas, orden, sincronización responsive, combinación y desactivación', async ({ page }) => {
  const state = await mockSupabase(page);
  state.categories[0].name = 'Nueva colección'; state.categories[0].sort_order = -1;
  state.products[0].customizable = false;
  await page.goto('/catalogo/');
  const buttons = page.locator('.catalog-groups button');
  await expect(buttons.nth(1)).toHaveText('Nueva colección');
  await buttons.nth(1).click();
  await expect(page.locator('.category-select select')).toHaveValue(state.categories[0].slug);
  await page.getByLabel('Solo personalizables').check();
  const expected = state.products.filter(p => p.active && p.customizable && p.category_id === state.categories[0].id).length;
  await expect(page.locator('[data-results] .product-card')).toHaveCount(expected);
  await page.setViewportSize({ width: 390, height: 850 });
  await expect(page.locator('.catalog-groups')).toBeVisible();
  await expect(page.locator('.category-select')).toBeHidden();
  await page.locator(`[data-group="${state.categories[1].slug}"]`).click();
  await expect(page.locator(`[data-group="${state.categories[1].slug}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-group=""]').click();
  await expect(page.locator('[data-group=""]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator(`[data-group="${state.categories[1].slug}"]`).click();
  state.categories[1].active = false;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.locator('.category-select select')).toHaveValue('');
  await expect(page.locator(`[data-group="${state.categories[1].slug}"]`)).toHaveCount(0);
  await expect(page).not.toHaveURL(/categoria=/);
});

test('respaldo sin registro o error de configuración conserva productos', async ({ page }) => {
  const state = await mockSupabase(page);
  state.catalog_section_settings.length = 0;
  await page.goto('/catalogo/');
  await expect(page.locator('#catalog-title')).toHaveText('Encuentra tu detalle');
  await expect(page.locator('[data-results] .product-card')).toHaveCount(6);
  await page.route('**/rest/v1/catalog_section_settings*', route => route.fulfill({ status: 503, body: '{}' }));
  await page.reload();
  await expect(page.locator('[data-results] .product-card')).toHaveCount(6);
  await expect(page.locator('#catalog-title')).toHaveText('Encuentra tu detalle');
});

test('validación, cancelar, aviso al salir y fallo de guardado conserva edición', async ({ page }) => {
  const state = await mockSupabase(page);
  await login(page);
  await page.getByRole('button', { name: 'Editar textos y filtros' }).click();
  const form = page.locator('#catalog-content-form');
  const title = form.locator('[name=title]');
  await expect(title).toBeEnabled();
  await title.fill('   ');
  await form.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#catalog-content-status')).toContainText('entre 1 y 120');
  await title.fill('Mi título');
  page.once('dialog', d => d.dismiss());
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/admin\/$/);
  state.failSave = true;
  await form.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('#catalog-content-status')).toContainText('No pudimos guardar');
  await expect(title).toHaveValue('Mi título');
  page.once('dialog', d => d.accept());
  await form.getByRole('button', { name: 'Cancelar cambios' }).click();
  await expect(title).toHaveValue('Encuentra tu detalle');
});

test('cada combinación de visibilidad respeta celular y escritorio', async ({ page }) => {
  const state = await mockSupabase(page);
  for (const [buttons, select] of [[true, true], [true, false], [false, true], [false, false]]) {
    Object.assign(state.catalog_section_settings[0], { show_category_buttons: buttons, show_category_select: select });
    await page.goto('/catalogo/');
    await expect(page.locator('[data-results] .product-card')).toHaveCount(6);
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      await expect(page.locator('.catalog-groups')).toBeVisible({ visible: buttons });
      await expect(page.locator('.category-select')).toBeVisible({ visible: select && !buttons });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('formulario accesible y usable en celular y escritorio', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await mockSupabase(page);
  await login(page);
  await page.getByRole('link', { name: 'Contenido del catálogo', exact: true }).click();
  await expect(page.locator('#catalog-content-form [name=title]')).toBeEnabled();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/catalog-content-${width}.png`, fullPage: true });
  }
});

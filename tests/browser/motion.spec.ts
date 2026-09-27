import { test, expect } from '@playwright/test';
import { mockSupabase } from './supabase-fixture';

test('entradas reales, reveal una vez, hover y header compacto', async ({ page }) => {
  await mockSupabase(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.locator('.banner-copy h1').evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
  await expect(page.locator('.product-card')).toHaveCount(6);
  const card = page.locator('.product-card').first();
  await card.scrollIntoViewIfNeeded();
  await expect(page.locator('.site-header')).toHaveClass(/is-compact/);
  await expect(card).not.toHaveClass(/motion-pending/);
  await expect.poll(() => card.evaluate(el => el.getAnimations().length)).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.site-header')).not.toHaveClass(/is-compact/);
  await card.scrollIntoViewIfNeeded();
  expect(await card.evaluate(el => el.getAnimations().length)).toBe(0);
  await card.hover();
  await expect(card.locator('.card-quick-action')).toHaveCSS('opacity', '1');
  await expect.poll(() => card.locator('.product-image img').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBeCloseTo(1.05, 2);
  await card.locator('.product-detail-link').click();
  await expect(page.locator('#product-title')).toBeVisible();
});

test('última búsqueda y foto ganan ante interacciones rápidas', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/catalogo/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.locator('[data-catalog-search]:visible').evaluate((el: HTMLInputElement) => {
    for (const text of ['no existe', 'corona', 'papá noel']) { el.value=text; el.dispatchEvent(new Event('input', { bubbles:true })); }
  });
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Papá Noel');
  await expect(page.locator('[data-results]')).not.toHaveAttribute('inert','');
  await page.locator('.product-detail-link').click();
  await expect(page.locator('#main-product-image')).toBeVisible();
  await page.locator('.gallery-thumbnails').evaluate(el => {
    const buttons=el.querySelectorAll<HTMLButtonElement>('button');
    buttons[1].click(); buttons[0].click(); buttons[1].click();
  });
  await expect(page.locator('#main-product-image')).toHaveAttribute('src','/images/placeholders/santa-detail.svg');
  await expect(page.locator('[data-image="1"]')).toHaveAttribute('aria-pressed','true');
  await expect.poll(() => page.locator('#main-product-image').evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(page.locator('#main-product-image')).toHaveCSS('opacity','1');
});

test('movimiento reducido conserva contenido, filtros y galería sin animaciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await mockSupabase(page);
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator('.motion-pending')).toHaveCount(0);
  await page.getByRole('button', { name:'Flores eternas', exact:true }).click();
  await expect(page.locator('[data-results]')).toContainText('No encontramos');
  await page.getByRole('button', { name:'Todo', exact:true }).click();
  await page.locator('.product-detail-link').first().click();
  await page.locator('[data-image="1"]').click();
  await expect(page.locator('#main-product-image')).toHaveAttribute('src','/images/placeholders/santa-detail.svg');
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test('cambiar preferencia durante una transición no deja contenido invisible', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.getByRole('button', { name:'Decoración', exact:true }).click();
  await page.emulateMedia({ reducedMotion:'reduce' });
  await expect(page.locator('[data-results]')).not.toHaveAttribute('inert','');
  await expect(page.locator('.motion-pending')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  await expect(page.locator('[data-results]')).toHaveCSS('opacity','1');
});

test.describe('interacciones táctiles', () => {
  test.use({ viewport:{width:375,height:850}, hasTouch:true, isMobile:true });
  test('presión visual, menú animado y acceso directo al detalle', async ({ page }) => {
    await mockSupabase(page);
    await page.goto('/');
    await page.getByLabel('Menú de navegación',{exact:true}).tap();
    const nav=page.getByRole('navigation',{name:'Navegación móvil',exact:true});
    await expect(nav).toBeVisible();
    await expect(nav).toHaveCSS('animation-name','amela-menu-in');
    await page.keyboard.press('Escape');
    const card=page.locator('.product-card').first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.card-quick-action')).toBeHidden();
    await card.locator('.product-detail-link').tap();
    await expect(page.locator('#product-title')).toBeVisible();
    await expect(page.locator('.mobile-quote')).toBeVisible();
  });
});

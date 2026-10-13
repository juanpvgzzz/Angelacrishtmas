import { test, expect } from '@playwright/test';
import { mockSupabase } from './supabase-fixture';

test('composición pública editorial y capturas responsive', async ({ page }) => {
  await mockSupabase(page);
  for (const width of [320, 375, 390, 428, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-results] .product-card')).toHaveCount(6);
    await expect(page.locator('.featured-section .product-card')).toHaveCount(4);
    await expect(page.locator('.new-section')).toHaveCount(0);
    await expect(page.locator('[data-managed-banner]')).toHaveCount(3);
    await expect(page.locator('.home-category')).toHaveCount(5);
    if (width === 390) {
      const third = await page.locator('.featured-section .product-card').nth(2).boundingBox();
      expect(third).not.toBeNull();
      expect(third!.x).toBeLessThan(width - 18);
      expect(third!.x + third!.width).toBeGreaterThan(width - 18);
      await page.locator('.featured-section [data-expand-carousel]').click();
      await expect(page.locator('.featured-section')).toHaveClass(/is-expanded/);
      await expect(page.locator('.featured-section .product-grid')).toHaveCSS('display', 'grid');
      await page.locator('.featured-section [data-expand-carousel]').click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('[data-results] .product-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width < 768 ? 2 : width < 1024 ? 3 : width < 1300 ? 4 : 5);
    await expect(page.locator('.product-card .product-category, .product-card .card-actions, .product-card .availability, .product-card .card-mark, .product-card .quote-price')).toHaveCount(0);
    const first = page.locator('.product-card').first();
    await expect(first.locator('a.product-detail-link')).toHaveCount(1);
    await expect(first.locator('img')).toHaveCSS('object-fit', 'contain');
    if (width < 768) {
      await expect(page.locator('.mobile-bottom-nav a')).toHaveCount(4);
      await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
      await expect(page.locator('.mobile-quote')).toBeHidden();
    } else await expect(page.locator('.mobile-bottom-nav')).toBeHidden();
    if (width === 390 || width === 1440) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `test-results/public-redesign-${width}.png`, fullPage: width === 1440 });
    }
  }
});

test('la portada omite nuevas creaciones y las tarjetas omiten el precio ausente', async ({ page }) => {
  const state = await mockSupabase(page);
  state.products[0].price = null;
  await page.goto('/');
  await expect(page.locator('.new-section')).toHaveCount(0);
  await expect(page.locator('[data-results] .product-card').first().locator('.price')).toHaveCount(0);
  await expect(page.locator('[data-results] .product-card').first().locator('img')).toBeVisible();
});

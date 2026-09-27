import { test, expect } from '@playwright/test';
import { mockSupabase } from './supabase-fixture';

for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
 test(`catálogo responsive ${width}: columnas, búsqueda, filtros y WhatsApp`, async ({ page }) => {
  const state = await mockSupabase(page);
  state.categories[0].name = 'Flores eternas';
  state.categories[0].section = 'munecas-de-trapo';
  state.products[0].name = 'Ramo de rosas';
  state.products[0].description = 'Pétalos de seda color borgoña';
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(6);
  const columns = await page.locator('.product-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width < 768 ? 2 : width < 1024 ? 3 : 4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (width < 768) {
   expect((await page.locator('.site-header').boundingBox())!.height).toBeLessThanOrEqual(72);
   await expect(page.locator('.mobile-quote')).toBeVisible();
  } else await expect(page.locator('.mobile-quote')).toBeHidden();
  const search = { fill: async (query: string) => {
    await page.locator('[data-catalog-search]:visible').click();
    const field = width < 768 ? page.locator('[data-search-dialog-input]') : page.locator('[data-catalog-search]:visible');
    await field.fill(query);
    await field.press('Enter');
  } };
  await search.fill('petalos borgona');
  await expect(page.locator('.product-card').first()).toContainText('Ramo de rosas');
  await search.fill('flores eternas');
  await expect(page.locator('.product-card').first()).toContainText('Ramo de rosas');
  await search.fill('zzzzsinresultado');
  await expect(page.getByRole('heading',{name:'No encontramos creaciones en esta selección'})).toBeVisible();
  await page.getByRole('button',{name:'Ver todo',exact:true}).click();
  await page.getByRole('button',{name:'Flores eternas',exact:true}).click();
  await expect(page.locator('.product-card').first()).toContainText('Ramo de rosas');
  await expect(page.getByRole('button',{name:'Flores eternas',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Todo',exact:true}).click();
  await expect(page.locator('.product-card')).toHaveCount(6);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`test-results/storefront-${width}.png`,fullPage:true});
  await page.locator('.product-detail-link').first().click();
  await expect(page.locator('#product-title')).toHaveText('Ramo de rosas');
  const detailColumns=await page.locator('.product-detail').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(detailColumns).toBe(width < 768 ? 1 : 2);
  const cta = page.locator('.product-detail-copy .whatsapp-button');
  expect(new URL((await cta.getAttribute('href'))!).searchParams.get('text')).toContain('Ramo de rosas');
  if (width < 768) await expect(page.locator('.mobile-quote a')).toHaveAttribute('href',(await cta.getAttribute('href'))!);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`test-results/detail-${width}.png`,fullPage:true});
 });
}

test('banners manuales, teclado, menú y fotografías visibles', async ({ page }) => {
 const state=await mockSupabase(page);
 state.products[0].images[0]={...state.products[0].images[0],kind:'photo',path:'products/test/photo.png'};
 await page.setViewportSize({width:375,height:850});
 await page.goto('/');
 await expect(page.locator('[data-banner-art="personalizados"] img')).toHaveAttribute('src',/storage\/v1\/object\/public/);
 await expect(page.locator('.catalog-banner')).toHaveCount(3);
 await page.locator('[data-banner-page="2"]').click();
 await expect(page.locator('[data-banner-page="2"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.banner-track').focus();
 await page.keyboard.press('ArrowLeft');
 await expect(page.locator('[data-banner-page="1"]')).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Menú de navegación',{exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('navigation',{name:'Navegación móvil',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('navigation',{name:'Navegación móvil',exact:true})).toBeHidden();
 state.products[0].active=false;
 await page.reload();
 await expect(page.locator('[data-banner-art] img')).toHaveCount(0);
});

test('fotografías fallidas y catálogo vacío conservan estados honestos',async({page})=>{
 const state=await mockSupabase(page);
 state.products[0].images=[];
 await page.goto('/catalogo/');
 await expect(page.locator('.product-card').first()).toContainText('Fotografía pendiente');
 state.products[0].images=[{kind:'photo',path:'products/broken.png',alt:'Foto',width:600,height:720}];
 await page.route('**/storage/v1/object/public/**',route=>route.fulfill({status:404,body:''}));
 await page.goto('/producto/?slug='+state.products[0].slug);
 await expect(page.locator('#main-product-image')).toHaveAttribute('src','/images/brand/image-pending.svg');
 await expect(page.locator('[data-gallery-caption]')).toHaveText('Fotografía no disponible');
 state.categories.forEach(c=>{c.active=false;});
 await page.goto('/');
 await expect(page.locator('.product-card')).toHaveCount(0);
 await expect(page.getByRole('heading',{name:'No encontramos creaciones en esta selección'})).toBeVisible();
});

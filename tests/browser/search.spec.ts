import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSupabase } from './supabase-fixture';

async function prepare(page: import('@playwright/test').Page) {
 const state=await mockSupabase(page);
 state.categories[0].name='Flores eternas';state.categories[0].slug='flores-eternas';
 state.products[0].name='Rosa eterna';
 state.categories[1].name='Muñecas';state.categories[1].section='munecas-de-trapo';
 state.products[2].name='Muñeca Lucía';
 return state;
}
for(const width of [375,768,1440]) test(`búsqueda predictiva ${width}: sugerencias, teclado y resultados`,async({page})=>{
 await prepare(page);await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.locator('.product-card')).toHaveCount(6);
 await page.locator('[data-catalog-search]:visible').click();
 const field=width<768?page.locator('[data-search-dialog-input]'):page.locator('[data-catalog-search]:visible');
 if(width<768){await expect(page.getByRole('dialog')).toBeVisible();await expect(field).toBeFocused();}
 await expect(page.locator('#search-options [role=option]').first()).toBeVisible();
 for(const query of ['flor','mune','arbol','navidad','regalo','personalizado']) {
  await field.fill(query);
  await expect(page.locator('#search-options .suggestion-copy').first()).toBeVisible();
  await expect(page.locator('.search-all')).toContainText(query);
  expect(await page.locator('#search-options .suggestion-copy').count()).toBeLessThanOrEqual(6);
 }
 await page.screenshot({path:"test-results/predictive-search-" + width + ".png"});
 await field.fill('muenca');
 await expect(page.locator('#search-options')).toContainText('Muñeca Lucía');
 await field.press('ArrowDown');
 await expect(field).toHaveAttribute('aria-activedescendant','search-option-0');
 await field.press('Enter');
 await expect(page.locator('#product-title')).toHaveText('Muñeca Lucía');
 await page.goto('/');await page.locator('[data-catalog-search]:visible').click();
 await field.fill('flor');await field.press('Enter');
 await expect(page).toHaveURL(/q=flor/);
 await expect(page.locator('.product-card').first()).toContainText('Rosa eterna');
 await expect(page.locator('#search-suggestions')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('modal móvil: cierre, foco, sin resultados y WhatsApp discreto',async({page})=>{
 await prepare(page);await page.setViewportSize({width:375,height:850});await page.goto('/');
 const cta=page.locator('.mobile-quote');
 expect((await cta.boundingBox())!.width).toBeLessThan(260);
 await page.locator('.header-search-toggle').click();
 const field=page.locator('[data-search-dialog-input]');
 await expect(field).toBeFocused();await field.fill('zzzxsincoincidencias');
 await expect(page.locator('[data-search-empty]')).toContainText('¿Quieres crear algo personalizado?');
 await expect(page.locator('[data-search-empty] a')).toHaveAttribute('href',/^https:\/\/wa.me\//);
 await expect.poll(()=>page.evaluate(()=>document.getAnimations().length)).toBe(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await field.press('Escape');await expect(page.getByRole('dialog')).toBeHidden();
 await expect(page.locator('.header-search-toggle')).toBeFocused();
 await expect(cta).toBeVisible();
});

test('dropdown: límite, consultas rápidas, cierre y contenido no interpretable como HTML',async({page})=>{
 const state=await prepare(page);state.products[0].name='<img src=x onerror=alert(1)> Rosa';
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 const field=page.locator('[data-catalog-search]:visible');await field.click();
 await field.fill('rosa');await field.fill('zzzz');await field.fill('flor');
 await expect(page.locator('.search-all')).toContainText('flor');
 await expect(page.locator('#search-options strong').first()).toContainText('<img src=x');
 await expect(page.locator('#search-options strong img')).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>document.getAnimations().length)).toBe(0);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
 await field.press('Escape');await expect(page.locator('#search-suggestions')).toBeHidden();
});

import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage();
page.on('requestfailed', r => console.log('FAILED', r.url(), r.failure()));
page.on('pageerror', e => console.log('ERROR', e.message));
page.on('response', async r => {
  if (r.url().includes('.supabase.co')) console.log('API', r.status(), new URL(r.url()).pathname, r.ok() ? 'OK' : (await r.text()).slice(0, 400));
});
const response = await page.goto('https://ameladesign.vercel.app/'); console.log('HTTP', response.status(), response.headers()['x-vercel-error']); if (!response.ok()) { console.log(await page.locator('body').innerText()); await browser.close(); process.exit(1); }
await page.waitForTimeout(5000);
console.log('CATALOG', (await page.locator('[data-live-catalog]').innerText()).slice(0, 500));
const scripts = await page.locator('script[src]').evaluateAll(es => es.map(e => e.src));
const seen = new Set();
async function inspect(url) {
  if (seen.has(url)) return; seen.add(url);
  const t = await (await page.request.get(url)).text();
  console.log('SCRIPT', url, 'hosts', t.match(/https:\/\/[a-z0-9.-]+supabase.co/g), 'missingConfig', t.includes('Falta configurar'));
  if(t.includes('Falta configurar')) {
    const i=t.indexOf('Falta configurar');
    console.log('CLIENT',t.slice(Math.max(0,i-350),i+450).replace(/sb_publishable_[\w-]+/g,'[PUBLIC KEY]').replace(/eyJ[\w.-]+/g,'[JWT]'));
  }
  for (const m of t.matchAll(/(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g)) await inspect(new URL(m[1],url).href);
}
for (const url of scripts) await inspect(url);
await page.goto('https://ameladesign.vercel.app/admin/');
await page.waitForTimeout(2000);
console.log('ADMIN',page.url(),await page.locator('#admin-panel').isVisible());
await browser.close();

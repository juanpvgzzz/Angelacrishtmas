import type { Page } from '@playwright/test';
import { categories as demoCategories } from '../../src/data/categories';
import { products as demoProducts } from '../../src/data/products';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export async function mockSupabase(page: Page, admin = true) {
  const state = {
    categories: demoCategories.map((c, i) => ({ id: id(i + 1), section: 'navidad', name: c.name, slug: c.slug, description: c.description, image_path: c.image.src, active: c.active, sort_order: c.order, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' })),
    products: demoProducts.map((p, i) => ({ id: id(i + 101), category_id: id(demoCategories.findIndex(c => c.id === p.categoryId) + 1), name: p.name, slug: p.slug, short_description: p.shortDescription, description: p.description, price: p.basePrice, price_from: p.priceFrom, currency: 'COP', availability: p.availability === 'under-order' ? 'made_to_order' : p.availability === 'unavailable' ? 'sold_out' : 'available', production_time: p.productionTime, customizable: true, customization_options: p.customizationOptions, active: p.active, featured: p.featured, sort_order: p.order, images: p.images.map(({ src, ...image }) => ({ ...image, path: src })), created_at: p.createdAt, updated_at: p.createdAt })),
    image_cleanup: [] as { path: string; created_at: string }[], uploads: [] as string[], removed: [] as string[], failSave: false,
  };
  const user = { id: id(999), aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url');
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${payload}.test`;
  await page.route('https://catalog-test.supabase.co/**', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const reply = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.includes('/auth/v1/token')) return reply({ access_token: token, token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh-token', user });
    if (url.pathname.includes('/auth/v1/user')) return reply(user);
    if (url.pathname.includes('/auth/v1/logout')) return reply({});
    if (url.pathname.includes('/storage/v1/object/public/')) return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64') });
    if (url.pathname.includes('/storage/v1/object/')) {
      if (method === 'DELETE') { state.removed.push(...request.postDataJSON().prefixes); return reply([]); }
      state.uploads.push(url.pathname.split('/product-images/')[1]); return reply({ Key: url.pathname, Id: id(800) });
    }
    const table = url.pathname.split('/rest/v1/')[1];
    if (table === 'admin_users') return reply(admin ? { user_id: user.id } : null);
    if (!['categories', 'products', 'image_cleanup'].includes(table)) return reply({ message: 'Unexpected fixture request' }, 400);
    // Mutable fixtures verify UI behavior only, not database security.
    const rows = state[table as 'categories' | 'products' | 'image_cleanup'] as unknown as Record<string, unknown>[];
    const matches = (row: Record<string, unknown>) => [...url.searchParams.entries()].every(([key, value]) => !value.startsWith('eq.') || String(row[key]) === value.slice(3));
    if (method === 'GET') return reply(rows.filter(matches));
    if (state.failSave && table === 'products') return reply({ code: '23505', message: 'Duplicate slug' }, 409);
    if (method === 'POST') {
      const data = request.postDataJSON(); const newRows = (Array.isArray(data) ? data : [data]).map(row => ({ created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row }));
      if (newRows.some(row => row.slug && rows.some(existing => existing.slug === row.slug))) return reply({ code: '23505' }, 409);
      rows.push(...newRows); return reply(newRows, 201);
    }
    const selected = rows.filter(matches);
    if (method === 'PATCH') selected.forEach(row => Object.assign(row, request.postDataJSON(), { updated_at: new Date().toISOString() }));
    if (method === 'DELETE') selected.forEach(row => rows.splice(rows.indexOf(row), 1));
    return reply(selected);
  });
  return state;
}
export async function login(page: Page) {
  await page.goto('/admin/login/');
  await page.getByLabel('Correo electrónico').fill('admin@example.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('test-fixture-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

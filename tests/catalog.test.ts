import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categories } from '../src/data/categories.ts';
import { products } from '../src/data/products.ts';
import { createDemoCatalog } from '../src/services/demo-catalog.ts';
import { buildWhatsAppUrl, EXAMPLE_WHATSAPP_NUMBER, productMessage } from '../src/utils/whatsapp.ts';

test('el catálogo excluye productos ocultos y productos de categorías ocultas en listas y detalle', async () => {
  const sourceCategories = structuredClone(categories);
  const sourceProducts = structuredClone(products);
  sourceCategories[0].active = false;
  sourceProducts[1].active = false;
  const catalog = createDemoCatalog(sourceCategories, sourceProducts);
  assert.equal((await catalog.getCategories()).some((item) => item.id === sourceCategories[0].id), false);
  assert.equal(await catalog.getCategoryBySlug(sourceCategories[0].slug), undefined);
  assert.equal(await catalog.getProductBySlug(sourceProducts[0].slug), undefined);
  assert.equal(await catalog.getProductBySlug(sourceProducts[1].slug), undefined);
  assert.ok((await catalog.getProducts()).every((item) => item.active && item.categoryId !== sourceCategories[0].id));
});

test('las categorías filtran por ID y conservan un estado vacío válido', async () => {
  const catalog = createDemoCatalog(categories, products);
  const ornaments = await catalog.getProducts('ornaments');
  assert.ok(ornaments.length > 0);
  assert.ok(ornaments.every((item) => item.categoryId === 'ornaments'));
  assert.deepEqual(await catalog.getProducts('home'), []);
  assert.equal(await catalog.getProductBySlug('no-existe'), undefined);
});

test('los datos de demostración tienen slugs únicos, categorías existentes e imágenes', () => {
  assert.equal(new Set(products.map((item) => item.slug)).size, products.length);
  assert.equal(new Set(categories.map((item) => item.slug)).size, categories.length);
  for (const product of products) {
    assert.ok(categories.some((category) => category.id === product.categoryId));
    assert.ok(product.images.length > 0);
    assert.ok(product.basePrice === null || product.basePrice >= 0);
    assert.ok(Number.isFinite(Date.parse(product.createdAt)));
  }
});

test('WhatsApp conserva nombres con acentos y caracteres especiales', () => {
  const message = productMessage('Ángel & estrella #1');
  assert.match(message, /quiero cotizar el producto Ángel & estrella #1 de ÁMELA/);
  const url = new URL(buildWhatsAppUrl('573123456789', message)!);
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/573123456789');
  assert.equal(url.searchParams.get('text'), message);
});

test('el número de ejemplo y los números inválidos nunca abren WhatsApp', () => {
  for (const number of ['', EXAMPLE_WHATSAPP_NUMBER, '+57 312 345 6789', 'javascript:alert(1)', '123']) {
    assert.equal(buildWhatsAppUrl(number, 'Hola'), null);
  }
});

test('cotizar incluye el enlace de la foto y conserva sus parámetros', () => {
  const photo = 'https://example.com/storage/angel.jpg?width=800&quality=90';
  const message = productMessage('Ángel & estrella #1', photo);
  const url = new URL(buildWhatsAppUrl('573046583246', message)!);
  assert.equal(url.searchParams.get('text'), `${productMessage('Ángel & estrella #1')}\n\nFoto del producto: ${photo}`);
  for (const invalid of ['javascript:alert(1)', 'data:image/png;base64,abc', '/relative.jpg']) {
    assert.equal(productMessage('Ángel', invalid), productMessage('Ángel'));
  }
});

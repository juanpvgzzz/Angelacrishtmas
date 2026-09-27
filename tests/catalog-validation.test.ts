import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, validateImage, friendlyError } from '../src/utils/catalog-validation.ts';
test('slugs utilizables con acentos, etiquetas y espacios', () => {
  assert.equal(slugify('  Ángel & Papá Noel! '), 'angel-papa-noel');
  assert.equal(slugify('<script>alert(1)</script>'), 'script-alert-1-script');
});
test('rechaza archivos vacíos, SVG, HTML y fotografías mayores que 5 MB', () => {
  for (const file of [{ type: 'image/svg+xml', size: 200 }, { type: 'text/html', size: 200 }, { type: 'image/jpeg', size: 5242881 }, { type: 'image/png', size: 0 }]) assert.throws(() => validateImage(file));
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.doesNotThrow(() => validateImage({ type, size: 5242880 }));
});
test('los errores públicos no filtran mensajes internos', () => {
  assert.match(friendlyError({ code: '23505', message: 'internal' }), /slug/);
  assert.doesNotMatch(friendlyError({ message: 'database password internal' }), /password|internal/);
});

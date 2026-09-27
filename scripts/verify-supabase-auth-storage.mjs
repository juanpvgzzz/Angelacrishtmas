// Se ejecuta explícitamente con cuentas temporales de prueba. Nunca con credenciales humanas.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env');
const credentials = JSON.parse(readFileSync('test-results/.remote-auth.local.json', 'utf8'));
assert.ok(credentials.every(row => row.email.startsWith('verification-') && row.email.endsWith('@example.invalid')));
const url = process.env.PUBLIC_SUPABASE_URL, key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = client(), guest = client(), visitor = client();
const categoryId = crypto.randomUUID(), productId = crypto.randomUUID();
const paths = [1, 2].map(() => `products/${productId}/${crypto.randomUUID()}.png`);
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=', 'base64');
const must = result => { assert.ifError(result.error); return result.data; };
let completed = false;
try {
  for (const [db, purpose] of [[admin, 'admin'], [guest, 'guest']]) {
    const credential = credentials.find(row => row.purpose === purpose);
    must(await db.auth.signInWithPassword({ email: credential.email, password: credential.password }));
    assert.equal(must(await db.auth.getUser()).user.id, credential.id);
  }
  assert.equal(must(await guest.from('admin_users').select('*')).length, 0);
  assert.equal((await guest.from('categories').insert({ name: 'PRUEBA NO AUTORIZADA', slug: crypto.randomUUID() })).error?.code, '42501');
  assert.ok((await guest.storage.from('product-images').upload(paths[0], png, { contentType: 'image/png' })).error);
  console.log('Auth real: login válido; cuenta sin membresía no puede administrar ni subir.');
  must(await admin.from('categories').insert({ id: categoryId, name: 'PRUEBA TEMPORAL — NO ES UN PRODUCTO REAL', slug: categoryId, active: false }));
  must(await admin.from('products').insert({ id: productId, category_id: categoryId, name: 'PRUEBA TEMPORAL — NO ES UN PRODUCTO REAL', slug: productId, active: false }));
  assert.equal(must(await visitor.from('products').select('*').eq('id', productId)).length, 0);
  assert.equal((await admin.from('products').insert({ category_id: categoryId, name: 'PRUEBA DUPLICADA', slug: productId })).error?.code, '23505');
  assert.equal((await admin.from('categories').delete().eq('id', categoryId)).error?.code, '23503');
  const badMime = await admin.storage.from('product-images').upload(`products/${productId}/${crypto.randomUUID()}.png`, Buffer.from('<svg/>'), { contentType: 'image/svg+xml' });
  assert.ok(badMime.error, 'Servidor debe rechazar SVG');
  const oversized = await admin.storage.from('product-images').upload(`products/${productId}/${crypto.randomUUID()}.png`, Buffer.alloc(5242881), { contentType: 'image/png' });
  assert.ok(oversized.error, 'Servidor debe rechazar archivos de más de 5 MB');
  const images = [];
  for (const path of paths) {
    must(await admin.from('image_cleanup').insert({ path }));
    must(await admin.storage.from('product-images').upload(path, png, { contentType: 'image/png', upsert: false }));
    images.push({ path, kind: 'photo', alt: 'Fotografía de prueba temporal', width: 1, height: 1 });
  }
  must(await admin.from('products').update({ images, price: 12500, price_from: true, availability: 'sold_out', customizable: true, customization_options: ['Prueba'], featured: true }).eq('id', productId).select());
  assert.equal(must(await admin.from('image_cleanup').select('*').in('path', paths)).length, 0);
  const imageResponse = await fetch(admin.storage.from('product-images').getPublicUrl(paths[0]).data.publicUrl);
  assert.ok(imageResponse.ok, 'Lectura pública de imagen');
  const protectedDelete = await admin.storage.from('product-images').remove([paths[0]]);
  assert.ok(protectedDelete.error || !protectedDelete.data?.length, 'No borrar imagen referenciada');
  must(await admin.from('products').update({ images: [images[1]] }).eq('id', productId));
  assert.equal(must(await admin.from('image_cleanup').select('*').eq('path', paths[0])).length, 1);
  must(await admin.storage.from('product-images').remove([paths[0]]));
  must(await admin.from('image_cleanup').delete().eq('path', paths[0]));
  const remaining = must(await admin.storage.from('product-images').list(`products/${productId}`));
  assert.deepEqual(remaining.map(row => row.name), [paths[1].split('/').at(-1)]);
  must(await admin.from('products').update({ active: true }).eq('id', productId));
  assert.equal(must(await visitor.from('products').select('*').eq('id', productId)).length, 0, 'Categoría oculta bloquea ficha');
  console.log('API real: CRUD, slugs, categoría con productos, fotografías, reemplazo, RLS y límites verificados.');
  completed = true;
} finally {
  // Retirar referencias antes de eliminar objetos mediante Storage API.
  must(await admin.from('products').delete().eq('id', productId));
  must(await admin.from('categories').delete().eq('id', categoryId));
  must(await admin.storage.from('product-images').remove(paths));
  must(await admin.from('image_cleanup').delete().in('path', paths));
  await Promise.all([admin.auth.signOut(), guest.auth.signOut()]);
  console.log(completed ? 'Contenido y sesiones de prueba retirados.' : 'Limpieza del intento de prueba completada.');
}

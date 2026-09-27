import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
process.loadEnvFile('.env');
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key?.startsWith('sb_publishable_'), 'Configura URL y publishable key');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (const table of ['categories', 'products']) {
  const result = await db.from(table).select('*');
  assert.ifError(result.error);
  assert.ok(result.data.every(row => row.active), `${table}: filas ocultas expuestas`);
  console.log(`${table}: lectura pública correcta (${result.data.length} filas activas)`);
}
const member = await db.from('admin_users').select('*');
assert.equal(member.error?.code, '42501', 'La lista administrativa debe estar prohibida');
const write = await db.from('categories').insert({ name: 'Prueba de rechazo anónimo', slug: `verification-${crypto.randomUUID()}` });
assert.equal(write.error?.code, '42501', 'La escritura anónima debe estar prohibida');
const upload = await db.storage.from('product-images').upload(`products/${crypto.randomUUID()}/${crypto.randomUUID()}.png`, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5WQAAAAASUVORK5CYII=', 'base64'), { contentType: 'image/png', upsert: false });
assert.ok(upload.error, 'La subida anónima debe estar prohibida');
assert.match(upload.error.message, /row.level security|not authorized|permission|unauthorized/i);
console.log('API real: escritura y subida anónimas rechazadas; administradores no expuestos.');
const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
assert.ok(response.ok, 'No se pudo consultar la configuración pública de Auth');
const settings = await response.json();
console.log(JSON.stringify({ disable_signup: settings.disable_signup, anonymous_enabled: settings.external?.anonymous_users ?? settings.external?.anonymous ?? false }));
if (!settings.disable_signup) console.log('PENDIENTE: desactivar Allow new users to sign up en Authentication → Sign In / Providers.');

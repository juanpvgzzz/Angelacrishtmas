import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

let client: SupabaseClient<Database> | undefined;
export function getSupabase() {
  if (client) return client;
  const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('Falta configurar Supabase. Consulta la guía de administración.');
  if (import.meta.env.MODE !== 'test' && (new URL(url).hostname === 'catalog-test.supabase.co' || key === 'sb_publishable_test_fixture')) {
    throw new Error('El servidor tiene configuracion de pruebas. Reinicia el sitio con las variables reales de Supabase.');
  }
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1]));
      if (payload.role !== 'anon') throw new Error();
    } catch { throw new Error('Usa únicamente una publishable key pública de Supabase.'); }
  }
  client = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

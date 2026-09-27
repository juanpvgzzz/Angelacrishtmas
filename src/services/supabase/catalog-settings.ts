import { getSupabase } from './client';
import { catalogDefaults, validateCatalogSettings, type CatalogSettings } from '../../config/catalog-settings';

export async function readCatalogSettings() {
  const { data, error } = await getSupabase().from('catalog_section_settings').select('*').eq('id', 'catalog').abortSignal(AbortSignal.timeout(5000)).maybeSingle();
  if (error) throw error;
  return data;
}
export async function publicCatalogSettings(): Promise<CatalogSettings> {
  try { return await readCatalogSettings() ?? { ...catalogDefaults }; }
  catch (error) {
    if (import.meta.env.DEV) console.warn('No se pudo leer la configuración del catálogo.', error);
    return { ...catalogDefaults };
  }
}
export async function saveCatalogSettings(value: CatalogSettings, updatedAt?: string) {
  const payload = validateCatalogSettings(value);
  const db = getSupabase();
  const result = updatedAt
    ? await db.from('catalog_section_settings').update(payload).eq('id', 'catalog').eq('updated_at', updatedAt).select().maybeSingle()
    : await db.from('catalog_section_settings').insert({ ...payload, id: 'catalog' }).select().single();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('La configuración cambió en otra sesión. Cancela los cambios y vuelve a cargarla.');
  return result.data;
}

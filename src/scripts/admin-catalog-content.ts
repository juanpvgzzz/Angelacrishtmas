import { catalogDefaults, catalogTextFields, catalogToggleFields, validateCatalogSettings, type CatalogSettings, type CatalogSettingsRow } from '../config/catalog-settings';
import { readCatalogSettings, saveCatalogSettings } from '../services/supabase/catalog-settings';

export function initCatalogContent() {
  const form = document.querySelector<HTMLFormElement>('#catalog-content-form')!;
  const fields = document.querySelector<HTMLFieldSetElement>('#catalog-content-fields')!;
  const status = document.querySelector<HTMLElement>('#catalog-content-status')!;
  const retry = document.querySelector<HTMLButtonElement>('#retry-catalog-content')!;
  const save = document.querySelector<HTMLButtonElement>('#save-catalog-content')!;
  let saved: CatalogSettingsRow | null = null;
  let baseline = '';
  let ready = false;
  let busy = false;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const value = (): CatalogSettings => {
    const result = { ...catalogDefaults };
    catalogTextFields.forEach(f => { result[f.key] = input(f.key).value; });
    catalogToggleFields.forEach(f => { result[f.key] = input(f.key).checked; });
    return result;
  };
  const dirty = () => ready && JSON.stringify(value()) !== baseline;
  const preview = () => {
    for (const key of ['eyebrow', 'title', 'description']) form.querySelector(`[data-preview="${key}"]`)!.textContent = input(key).value;
  };
  const populate = () => {
    const data = saved ?? catalogDefaults;
    catalogTextFields.forEach(f => { input(f.key).value = data[f.key]; });
    catalogToggleFields.forEach(f => { input(f.key).checked = data[f.key]; });
    baseline = JSON.stringify(value());
    preview();
  };
  async function load() {
    if (busy) return;
    busy = true; fields.disabled = true; retry.hidden = true;
    status.textContent = 'Cargando configuración…';
    try {
      saved = await readCatalogSettings(); populate(); ready = true;
      status.textContent = saved ? '' : 'Todavía no hay configuración guardada. Se muestran los textos originales.';
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Configuración del catálogo', error);
      ready = false; retry.hidden = false;
      status.textContent = 'No pudimos cargar la configuración. Revisa tu conexión y que la migración esté aplicada; vuelve a intentar.';
    } finally { busy = false; fields.disabled = !ready; }
  }
  const open = () => {
    form.hidden = false;
    if (!ready) void load();
    else input('eyebrow').focus();
  };
  document.querySelector('#open-catalog-content')!.addEventListener('click', open);
  document.querySelector('a[href="#catalog-content-title"]')!.addEventListener('click', open);
  if (location.hash === '#catalog-content-title') open();
  retry.addEventListener('click', () => { void load(); });
  form.addEventListener('input', () => {
    preview();
  });
  document.querySelector('#cancel-catalog-content')!.addEventListener('click', () => {
    if (busy || (dirty() && !confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?'))) return;
    populate(); status.textContent = 'Cambios cancelados.';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !ready || !form.reportValidity()) return;
    let payload: CatalogSettings;
    try { payload = validateCatalogSettings(value()); }
    catch (error) { status.textContent = (error as Error).message; return; }
    busy = true; fields.disabled = true; form.setAttribute('aria-busy', 'true');
    save.textContent = 'Guardando…'; status.textContent = 'Guardando cambios…';
    try {
      saved = await saveCatalogSettings(payload, saved?.updated_at); populate(); retry.hidden = true;
      status.textContent = 'Cambios guardados. El catálogo los mostrará al cargar o volver a su pestaña.';
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Guardado del catálogo', error);
      status.textContent = error instanceof Error && error.message.startsWith('La configuración cambió') ? error.message : 'No pudimos guardar. Revisa tu conexión y tu acceso administrativo; tus cambios siguen en el formulario.';
      retry.hidden = false;
    } finally { busy = false; fields.disabled = false; save.textContent = 'Guardar cambios'; form.removeAttribute('aria-busy'); }
  });
  retry.addEventListener('click', event => {
    if (dirty() && !confirm('Volver a cargar descartará tus cambios sin guardar. ¿Continuar?')) event.stopImmediatePropagation();
  }, true);
  window.addEventListener('beforeunload', event => { if (busy || dirty()) event.preventDefault(); });
  document.addEventListener('click', event => {
    const target = (event.target as Element).closest('a, #logout');
    if (!target || (target instanceof HTMLAnchorElement && (target.target === '_blank' || target.getAttribute('href')?.startsWith('#')))) return;
    if (busy || (dirty() && !confirm('Tienes cambios sin guardar. ¿Quieres salir y descartarlos?'))) {
      event.preventDefault(); event.stopImmediatePropagation();
    } else if (dirty()) { populate(); }
  }, true);
}

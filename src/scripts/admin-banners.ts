import { getSupabase } from '../services/supabase/client';
import { imageUrl, requireAdmin } from '../services/supabase/catalog';
import { prepareImage } from '../utils/admin-image';
import { validateImage, friendlyError } from '../utils/catalog-validation';
import type { Database } from '../types/database';

type Banner = Database['public']['Tables']['catalog_banners']['Row'];
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const form = document.querySelector<HTMLFormElement>('#banner-form')!;
const dialog = document.querySelector<HTMLDialogElement>('#banner-editor')!;
const list = document.querySelector<HTMLElement>('#banner-list')!;
const status = document.querySelector<HTMLElement>('#banner-status')!;
let banners: Banner[] = [];
let current: Banner | undefined;
let busy = false;

function render() {
  list.innerHTML = banners.length ? banners.map(row => `<article class="admin-row"><div class="admin-item">${row.image_path ? `<img class="item-image" src="${escape(imageUrl(row.image_path))}" alt="" width="62" height="72" loading="lazy" />` : ''}<div><h3>${escape(row.title)}</h3><p>${escape(row.description)}</p><span class="status-badge ${row.active ? 'active' : ''}">${row.active ? 'Activo' : 'Oculto'}</span> <span>Orden ${row.sort_order}</span></div></div><div class="admin-actions"><button type="button" class="button button-outline" data-banner-action="edit" data-id="${row.id}">Editar</button><button type="button" class="button button-outline" data-banner-action="delete" data-id="${row.id}">Eliminar</button></div></article>`).join('') : '<p>Aún no hay banners administrados. El catálogo muestra las campañas originales.</p>';
}
export async function loadBanners() {
  const { data, error } = await getSupabase().from('catalog_banners').select('*').order('sort_order').order('id');
  if (error) { list.textContent = 'No pudimos cargar los banners. Comprueba que la migración esté aplicada.'; return; }
  banners = data; render();
}
function open(row?: Banner) {
  current = row;
  form.reset();
  for (const name of ['title', 'eyebrow', 'description', 'button_label', 'href', 'sort_order'] as const) {
    (form.elements.namedItem(name) as HTMLInputElement).value = row ? String(row[name]) : name === 'href' ? '/catalogo/' : name === 'button_label' ? 'Explorar catálogo' : name === 'sort_order' ? '0' : '';
  }
  (form.elements.namedItem('active') as HTMLInputElement).checked = row?.active ?? false;
  document.querySelector('#banner-editor-title')!.textContent = row ? 'Editar banner' : 'Crear banner';
  document.querySelector('#banner-image-status')!.textContent = row?.image_path ? 'Fotografía actual conservada. Selecciona otra para reemplazarla.' : 'Sin fotografía. Puedes agregar una ahora o después.';
  status.textContent = '';
  dialog.showModal();
}
document.querySelector('#new-banner')!.addEventListener('click', () => open());
document.querySelector('#cancel-banner')!.addEventListener('click', () => { if (!busy) dialog.close(); });
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
list.addEventListener('click', async event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-banner-action]');
  if (!button || busy) return;
  const row = banners.find(item => item.id === button.dataset.id);
  if (!row) return;
  if (button.dataset.bannerAction === 'edit') { open(row); return; }
  if (!confirm(`¿Eliminar el banner «${row.title}»? Esta acción no se puede deshacer.`)) return;
  busy = true; button.disabled = true;
  try {
    if (!await requireAdmin()) { location.replace('/admin/login/'); return; }
    const { data, error } = await getSupabase().from('catalog_banners').delete().eq('id', row.id).eq('updated_at', row.updated_at).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('El banner cambió en otra sesión. Actualiza el panel.');
    await loadBanners();
    document.querySelector('#admin-status')!.textContent = 'Banner eliminado.';
  } catch (error) { document.querySelector('#admin-status')!.textContent = friendlyError(error); }
  finally { busy = false; button.disabled = false; }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const values = new FormData(form);
  const get = (name: string) => String(values.get(name) || '').trim();
  const href = get('href');
  if (!/^\/(?:catalogo\/|producto\/|navidad\/|flores-eternas\/|osos-de-peluche\/|regalos-personalizados\/|munecas-de-trapo\/|categoria\/|#|$)/.test(href)) { status.textContent = 'Usa un enlace interno válido.'; return; }
  busy = true; (form.querySelector('fieldset') as HTMLFieldSetElement).disabled = true;
  status.textContent = 'Guardando banner…';
  const db = getSupabase();
  const id = current?.id || crypto.randomUUID();
  let uploaded: string | undefined;
  try {
    if (!await requireAdmin()) { location.replace('/admin/login/'); return; }
    let path = current?.image_path || null;
    const file = (form.elements.namedItem('image') as HTMLInputElement).files?.[0];
    if (file) {
      validateImage(file);
      const prepared = await prepareImage(file);
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[prepared.file.type];
      uploaded = `banners/${id}/${crypto.randomUUID()}.${ext}`;
      const queued = await db.from('image_cleanup').insert({ path: uploaded });
      if (queued.error) throw queued.error;
      const upload = await db.storage.from('product-images').upload(uploaded, prepared.file, { contentType: prepared.file.type, upsert: false });
      if (upload.error) throw upload.error;
      path = uploaded;
    }
    const payload = { title: get('title'), eyebrow: get('eyebrow'), description: get('description'), button_label: get('button_label'), href, sort_order: Number(get('sort_order')), active: values.has('active'), image_path: path };
    const result = current ? await db.from('catalog_banners').update(payload).eq('id', id).eq('updated_at', current.updated_at).select('id') : await db.from('catalog_banners').insert({ ...payload, id }).select('id');
    if (result.error) throw result.error;
    if (!result.data.length) throw new Error('El banner cambió en otra sesión. Vuelve a cargarlo.');
    // El disparador conserva en la cola los archivos sustituidos hasta su limpieza.
    dialog.close(); await loadBanners();
    document.querySelector('#admin-status')!.textContent = 'Banner guardado. Se mostrará en el catálogo al recargar.';
  } catch (error) {
    status.textContent = friendlyError(error);
  } finally { busy = false; (form.querySelector('fieldset') as HTMLFieldSetElement).disabled = false; }
});

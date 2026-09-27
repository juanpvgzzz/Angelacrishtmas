import { prepareImage } from '../utils/admin-image';
import { getSupabase } from '../services/supabase/client';
import { readAll } from '../services/supabase/read-all';
import { sections, sectionName } from '../config/sections';
import { requireAdmin, imageUrl } from '../services/supabase/catalog';
import { friendlyError, slugify, validateImage, optionalPrice } from '../utils/catalog-validation';
import type { Database, Json } from '../types/database';
type Category = Database['public']['Tables']['categories']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Photo = { path: string; kind: 'photo' | 'placeholder'; alt: string; width: number; height: number; file?: File; preview?: string };
const e = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let categories: Category[] = [], products: Product[] = [];
let editing: { type: 'categories' | 'products'; id: string; existing: boolean; updatedAt?: string };
let photos: Photo[] = [], busy = false, dirty = false;
let pageNumber = 1;
const pageSize = 12;
const searchInput = $<HTMLInputElement>('#admin-search');
const visibilityFilter = $<HTMLSelectElement>('#admin-visibility');
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sectionFilter = $<HTMLSelectElement>('#admin-section');
const dialog = $<HTMLDialogElement>('#editor');
const form = $<HTMLFormElement>('#catalog-form');
const message = (text: string) => { $('#admin-status').textContent = text; };
const button = (label: string, action: string, id: string) => `<button type="button" class="button button-outline" data-action="${action}" data-id="${id}">${label}</button>`;

async function refresh() {
  const db = getSupabase();
  const [c, p] = await Promise.all([
    readAll((from, to) => db.from('categories').select('*').order('sort_order').order('name').order('id').range(from, to)),
    readAll((from, to) => db.from('products').select('*').order('sort_order').order('name').order('id').range(from, to)),
  ]);
  categories = c; products = p;
  renderCatalog();
}
function renderCatalog() {
  const shownCategories = categories.filter(row => !sectionFilter.value || row.section === sectionFilter.value);
  const shownProducts = products.filter(row => shownCategories.some(category => category.id === row.category_id));
  $('#admin-summary').innerHTML = [
    ['Categorías', shownCategories.length], ['Productos', shownProducts.length], ['Activos', shownProducts.filter(p => p.active).length],
    ['Ocultos', shownProducts.filter(p => !p.active).length], ['Agotados', shownProducts.filter(p => p.availability === 'sold_out').length], ['Destacados', shownProducts.filter(p => p.featured).length],
  ].map(([label, count]) => `<p>${label}<strong>${count}</strong></p>`).join('');
  const query = normalize(searchInput.value.trim());
  const filtered = shownProducts.filter(product => {
    const category = categories.find(c => c.id === product.category_id);
    const matchesQuery = normalize(`${product.name} ${product.short_description} ${category?.name || ''}`).includes(query);
    const state = visibilityFilter.value;
    return matchesQuery && (!state || (state === 'active' && product.active) || (state === 'hidden' && !product.active) || (state === 'sold_out' && product.availability === 'sold_out') || (state === 'featured' && product.featured));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  pageNumber = Math.min(pageNumber, pageCount);
  const pageProducts = filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  $('#product-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'}${query || visibilityFilter.value ? ' en esta búsqueda' : ' en tu catálogo'}`;
  $('#page-info').textContent = `Página ${pageNumber} de ${pageCount}`;
  $<HTMLButtonElement>('#previous-page').disabled = pageNumber === 1;
  $<HTMLButtonElement>('#next-page').disabled = pageNumber === pageCount;
  $('.admin-pagination').hidden = filtered.length <= pageSize;
  for (const [type, rows, selector] of [['categories', shownCategories, '#category-list'], ['products', pageProducts, '#product-list']] as const) {
    $(selector).innerHTML = rows.length ? rows.map(row => {
      const product = type === 'products' ? row as Product : undefined;
      const category = type === 'categories' ? row as Category : categories.find(c => c.id === product?.category_id);
      const photo = product ? (product.images as unknown as Photo[])[0]?.path : (row as Category).image_path;
      const src = photo ? imageUrl(photo) : '/images/brand/image-pending.svg';
      const price = product ? product.price === null ? 'Precio a consultar' : `${product.price_from ? 'Desde ' : ''}${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.price)}` : '';
      return `<article class="admin-row"><div class="admin-item"><img class="item-image" src="${e(src)}" alt="" width="62" height="72" loading="lazy" decoding="async" /><div><h3>${e(row.name)}</h3><p>${e(sectionName(category?.section || 'navidad'))}${product ? ` · ${e(category?.name || 'Sin categoría')}` : ` · ${products.filter(p => p.category_id === row.id).length} productos`}</p><div class="item-tags"><span class="status-badge ${row.active ? 'active' : ''}">${row.active ? 'Activo' : 'Oculto'}</span>${product?.availability === 'sold_out' ? '<span class="status-badge sold-out">Agotado</span>' : ''}${product?.featured ? '<span class="status-badge">Destacado</span>' : ''}${product && !category?.active ? '<span class="status-badge">Categoría oculta</span>' : ''}<span class="item-price">${e(price)}</span></div></div></div><div class="admin-actions" role="group" aria-label="Acciones para ${e(row.name)}">${button('Editar', `${type}:edit`, row.id)}${button(row.active ? 'Ocultar' : 'Activar', `${type}:toggle`, row.id)}${button('Eliminar', `${type}:delete`, row.id)}</div></article>`;
    }).join('') : `<div class="admin-empty"><strong>${type === 'products' && (query || visibilityFilter.value) ? 'No encontramos coincidencias' : type === 'products' ? 'Tu próxima creación empieza aquí' : 'Organiza tus creaciones'}</strong><p>${type === 'products' && (query || visibilityFilter.value) ? 'Prueba otro nombre o limpia los filtros.' : type === 'products' ? 'Usa Crear producto para agregar tu primera pieza a esta sección.' : 'Usa Crear categoría para comenzar a agrupar tus productos.'}</p></div>`;
  }
}

const field = (label: string, name: string, value: string | number = '', attributes = '') => `<label>${label}<input name="${name}" value="${e(String(value))}" ${attributes} /></label>`;
const area = (label: string, name: string, value = '') => `<label>${label}<textarea name="${name}" rows="3" maxlength="12000">${e(value)}</textarea></label>`;
const check = (label: string, name: string, checked = false) => `<label><input name="${name}" type="checkbox" ${checked ? 'checked' : ''} />${label}</label>`;
function resetPreviews() { photos.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); }); }
function openEditor(type: 'categories' | 'products', id?: string) {
  if (busy) return;
  dirty = false;
  resetPreviews();
  const row = (type === 'categories' ? categories : products).find(item => item.id === id);
  const p = type === 'products' ? row as Product | undefined : undefined;
  const c = type === 'categories' ? row as Category | undefined : undefined;
  editing = { type, id: row?.id || crypto.randomUUID(), existing: Boolean(row), updatedAt: row?.updated_at };
  photos = p ? structuredClone(p.images as unknown as Photo[]) : c?.image_path ? [{ path: c.image_path, kind: c.image_path.startsWith('/') ? 'placeholder' : 'photo', alt: c.name, width: 600, height: 720 }] : [];
  $('#editor-title').textContent = `${row ? 'Editar' : 'Crear'} ${type === 'categories' ? 'categoría' : 'producto'}`;
  $('#editor-status').textContent = '';
  $('#editor-fields').innerHTML = `${field('Nombre', 'name', row?.name, 'required maxlength="160"')}${field('Slug', 'slug', row?.slug, 'required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="120"')}${area('Descripción completa', 'description', row?.description || '')}${field('Orden', 'sort_order', row?.sort_order || 0, 'type="number" required step="1" min="0" max="2147483647"')}${check('Visible en el catálogo', 'active', row?.active ?? false)}
  ${type === 'products' ? `<label>Categoría<select name="category_id" required><option value="">Selecciona una categoría</option>${categories.map(category => `<option value="${category.id}" ${p?.category_id === category.id ? 'selected' : ''}>${e(category.name)}${category.active ? '' : ' (oculta)'}</option>`).join('')}</select></label>${field('Descripción corta', 'short_description', p?.short_description, 'required maxlength="500"')}${field('Precio en pesos colombianos (opcional)', 'price', p?.price ?? '', 'type="number" min="0" max="9999999999.99" step="0.01" aria-describedby="price-help"')}<p id="price-help">Déjalo vacío para recibir cotizaciones por WhatsApp. Si escribes un precio, se mostrará en el catálogo.</p>${check('Precio desde', 'price_from', p?.price_from)}${field('Moneda', 'currency', 'COP', 'readonly')}<label>Disponibilidad<select name="availability"><option value="available" ${p?.availability === 'available' ? 'selected' : ''}>Disponible</option><option value="made_to_order" ${!p || p.availability === 'made_to_order' ? 'selected' : ''}>Bajo pedido</option><option value="sold_out" ${p?.availability === 'sold_out' ? 'selected' : ''}>Agotado</option></select></label>${field('Tiempo de elaboración', 'production_time', p?.production_time, 'maxlength="300"')}${check('Personalizable', 'customizable', p?.customizable)}${area('Opciones de personalización (una por línea)', 'customization_options', p?.customization_options.join('\n'))}${check('Producto destacado', 'featured', p?.featured)}` : ''}
  <label>${type === 'products' ? 'Fotografías (máximo 12)' : 'Fotografía de categoría'}<input type="file" id="photo-input" accept="image/jpeg,image/png,image/webp" ${type === 'products' ? 'multiple' : ''} /></label><p>JPEG, PNG o WebP, máximo 5 MB por archivo. Las imágenes grandes se reducen a 1600 píxeles y se comprimen cuando es posible. La primera será la principal. Los cambios se aplican al guardar.</p><div id="photo-list"></div>`;
  const name = form.elements.namedItem('name') as HTMLInputElement;
  const initialSection = c?.section || categories.find(category => category.id === p?.category_id)?.section || sectionFilter.value || 'navidad';
  $('#editor-fields').insertAdjacentHTML('afterbegin', `<div><label for="editor-section">Sección</label><select id="editor-section" name="section" required>${sections.map(section => `<option value="${section.id}" ${section.id === initialSection ? 'selected' : ''}>${section.name}</option>`).join('')}</select></div>`);
  if (type === 'products') {
    const priceInput = form.elements.namedItem('price') as HTMLInputElement;
    const priceFrom = form.elements.namedItem('price_from') as HTMLInputElement;
    const updatePriceState = () => {
      priceFrom.disabled = priceInput.value.trim() === '';
      if (priceFrom.disabled) priceFrom.checked = false;
    };
    priceInput.addEventListener('input', updatePriceState);
    updatePriceState();
    const categoryInput = form.elements.namedItem('category_id') as HTMLSelectElement;
    const sectionInput = form.elements.namedItem('section') as HTMLSelectElement;
    const updateCategories = (selectedId = '') => {
      categoryInput.innerHTML = '<option value="">Selecciona una categoría</option>' + categories.filter(category => category.section === sectionInput.value).map(category => `<option value="${category.id}" ${category.id === selectedId ? 'selected' : ''}>${e(category.name)}${category.active ? '' : ' (oculta)'}</option>`).join('');
    };
    updateCategories(p?.category_id);
    sectionInput.addEventListener('change', () => updateCategories());
  }
  const slug = form.elements.namedItem('slug') as HTMLInputElement;
  let customSlug = Boolean(row); slug.addEventListener('input', () => { customSlug = true; });
  name.addEventListener('input', () => { if (!customSlug) slug.value = slugify(name.value); });
  $<HTMLInputElement>('#photo-input').addEventListener('change', async event => {
    const input = event.target as HTMLInputElement; const files = [...(input.files || [])];
    if (!files.length || busy) return;
    busy = true;
    form.querySelectorAll<HTMLButtonElement | HTMLFieldSetElement>('button, fieldset').forEach(el => { el.disabled = true; });
    $('#editor-status').textContent = 'Preparando fotografías…';
    const prepared: Photo[] = [];
    try {
      files.forEach(validateImage);
      if (photos.length + files.length > (type === 'products' ? 12 : 1)) throw new Error(type === 'products' ? 'Puedes guardar hasta 12 fotografías.' : 'Retira la fotografía actual antes de subir su reemplazo.');
      for (const original of files) {
        const { file, width, height } = await prepareImage(original);
        prepared.push({ path: '', kind: 'photo', alt: name.value, width, height, file, preview: URL.createObjectURL(file) });
      }
      photos.push(...prepared);
      dirty = true;
      renderPhotos(); $('#editor-status').textContent = '';
    } catch (error) { prepared.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); }); $('#editor-status').textContent = (error as Error).message; }
    finally { busy = false; form.querySelectorAll<HTMLButtonElement | HTMLFieldSetElement>('button, fieldset').forEach(el => { el.disabled = false; }); input.value = ''; } 
  });
  const fields = $('#editor-fields');
  const group = (name: string, title: string) => {
    const input = form.elements.namedItem(name) as HTMLElement | null;
    const label = input?.closest('label');
    if (label) label.insertAdjacentHTML('beforebegin', `<h3>${title}</h3>`);
  };
  group('name', 'Información de tu creación');
  group('category_id', 'Cómo aparece en la tienda');
  group('customizable', 'Personalización');
  $('#photo-input').closest('label')!.insertAdjacentHTML('beforebegin', '<h3>Fotografías</h3>');
  fields.querySelector('input[name="slug"]')!.setAttribute('aria-description', 'Parte final del enlace. Se completa automáticamente a partir del nombre.');
  renderPhotos(); dialog.showModal(); name.focus();
}
function renderPhotos() {
  $('#photo-list').innerHTML = photos.map((photo, index) => `<div class="photo-row"><img src="${e(photo.preview || imageUrl(photo.path))}" alt="${e(photo.alt)}" /><p>${index === 0 ? 'Principal' : `Fotografía ${index + 1}`}${photo.kind === 'placeholder' ? ' · Imagen de muestra' : ''}</p><label>Texto alternativo<input data-alt="${index}" value="${e(photo.alt)}" maxlength="300" /></label><div class="admin-actions">${index ? `<button class="button button-outline" type="button" data-photo="main" data-index="${index}">Hacer principal</button><button class="button button-outline" type="button" data-photo="up" data-index="${index}">Subir</button>` : ''}${index < photos.length - 1 ? `<button class="button button-outline" type="button" data-photo="down" data-index="${index}">Bajar</button>` : ''}<button class="button button-outline" type="button" data-photo="remove" data-index="${index}">Retirar / reemplazar</button></div></div>`).join('');
  $('#photo-list').querySelectorAll<HTMLInputElement>('[data-alt]').forEach(input => input.addEventListener('input', () => { photos[Number(input.dataset.alt)].alt = input.value; }));
  $('#photo-list').querySelectorAll<HTMLButtonElement>('[data-photo]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.index); const action = button.dataset.photo;
    if (action === 'remove') { const [removed] = photos.splice(index, 1); if (removed.preview) URL.revokeObjectURL(removed.preview); }
    else { const target = action === 'main' ? 0 : action === 'up' ? index - 1 : index + 1; const [photo] = photos.splice(index, 1); photos.splice(target, 0, photo); }
    renderPhotos(); $('#photo-input').focus();
    dirty = true;
  }));
}
async function cleanPaths(paths: string[]) {
  const db = getSupabase(); let pending = 0;
  for (const path of paths.filter(path => !path.startsWith('/'))) {
    try {
    // Storage RLS refuses deletion while any category/product still references this path.
    const { error } = await db.storage.from('product-images').remove([path]);
    if (error) { pending++; continue; }
    const result = await db.from('image_cleanup').delete().eq('path', path);
    if (result.error) pending++;
    } catch { pending++; }
  }
  return pending;
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !form.reportValidity()) return;
  const data = new FormData(form); const text = (key: string) => String(data.get(key) || '').trim();
  if (!text('name') || !text('slug')) { $('#editor-status').textContent = 'Completa el nombre y el slug.'; return; }
  let price: number | null = null;
  if (editing.type === 'products') {
    try { price = optionalPrice(text('price')); }
    catch (error) { $('#editor-status').textContent = (error as Error).message; return; }
  }
  busy = true; form.querySelectorAll<HTMLButtonElement | HTMLFieldSetElement>('button, fieldset').forEach(el => { el.disabled = true; });
  const uploaded: string[] = []; let saved = false;
  const progress = $<HTMLProgressElement>('#upload-progress'); progress.hidden = false; progress.value = 0;
  $('#editor-status').textContent = 'Guardando cambios…';
  try {
    const db = getSupabase();
    if (!await requireAdmin()) { location.replace('/admin/login/'); return; }
    const finalPhotos: Omit<Photo, 'file' | 'preview'>[] = [];
    const total = photos.filter(photo => photo.file).length; let completed = 0;
    for (const photo of photos) {
      let path = photo.path;
      if (photo.file) {
        validateImage(photo.file);
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[photo.file.type];
        path = `${editing.type}/${editing.id}/${crypto.randomUUID()}.${extension}`;
        const queued = await db.from('image_cleanup').insert({ path }); if (queued.error) throw queued.error;
        uploaded.push(path);
        $('#editor-status').textContent = `Subiendo fotografía ${completed + 1} de ${total}…`;
        const result = await db.storage.from('product-images').upload(path, photo.file, { contentType: photo.file.type, upsert: false });
        if (result.error) throw result.error;
        completed++; progress.value = Math.round(completed / total * 90);
      }
      finalPhotos.push({ path, kind: photo.kind, alt: photo.alt.trim() || text('name'), width: photo.width, height: photo.height });
    }
    const common = { name: text('name'), slug: text('slug'), description: text('description'), active: data.has('active'), sort_order: Number(text('sort_order')) };
    let error, rows;
    if (editing.type === 'categories') {
      const payload = { ...common, section: text('section'), image_path: finalPhotos[0]?.path || null };
      const result = editing.existing ? await db.from('categories').update(payload).eq('id', editing.id).eq('updated_at', editing.updatedAt!).select('id') : await db.from('categories').insert({ ...payload, id: editing.id }).select('id');
      error = result.error; rows = result.data;
    } else {
      const payload = { ...common, category_id: text('category_id'), short_description: text('short_description'), price, price_from: price !== null && data.has('price_from'), currency: 'COP', availability: text('availability'), production_time: text('production_time'), customizable: data.has('customizable'), customization_options: data.has('customizable') ? text('customization_options').split('\n').map(s => s.trim()).filter(Boolean) : [], featured: data.has('featured'), images: finalPhotos as unknown as Json };
      const result = editing.existing ? await db.from('products').update(payload).eq('id', editing.id).eq('updated_at', editing.updatedAt!).select('id') : await db.from('products').insert({ ...payload, id: editing.id }).select('id');
      error = result.error; rows = result.data;
    }
    if (error) throw error;
    if (!rows?.length) { $('#editor-status').textContent = 'El registro cambió en otra sesión. Cierra este formulario y vuelve a abrirlo.'; await cleanPaths(uploaded); return; }
    saved = true; progress.value = 100;
    const old = editing.type === 'categories' ? categories.find(row => row.id === editing.id)?.image_path : null;
    const previous = editing.type === 'products' ? (products.find(row => row.id === editing.id)?.images || []) as unknown as Photo[] : old ? [{ path: old }] : [];
    const pending = await cleanPaths(previous.map(photo => photo.path).filter(path => !finalPhotos.some(photo => photo.path === path)));
    dirty = false; resetPreviews(); photos = []; dialog.close(); await refresh();
    message(pending ? 'Cambios guardados. Quedaron fotografías pendientes de limpieza.' : 'Cambios guardados. El catálogo los mostrará al cargar.');
  } catch (error) {
    if (!saved) {
      const pending = await cleanPaths(uploaded).catch(() => uploaded.length);
      $('#editor-status').textContent = `${friendlyError(error)}${pending ? ' Hay cargas pendientes de limpieza; podrás reintentarlo desde el panel.' : ''}`;
    } else { dialog.close(); message('Los cambios se guardaron, pero no se pudo actualizar el panel. Recarga para consultarlos.'); }
  } finally { busy = false; progress.hidden = true; form.querySelectorAll<HTMLButtonElement | HTMLFieldSetElement>('button, fieldset').forEach(el => { el.disabled = false; }); }
});
form.addEventListener('input', () => { dirty = true; });
form.addEventListener('change', () => { dirty = true; });
const canClose = () => !busy && (!dirty || confirm('Tienes cambios sin guardar. ¿Quieres descartarlos?'));
$('#cancel-edit').addEventListener('click', () => { if (canClose()) dialog.close(); });
dialog.addEventListener('cancel', event => { if (!canClose()) event.preventDefault(); });
dialog.addEventListener('close', () => { resetPreviews(); photos = []; });
window.addEventListener('beforeunload', event => { if (busy || (dialog.open && dirty)) event.preventDefault(); });
document.querySelectorAll<HTMLAnchorElement>('.admin-sidebar nav a').forEach(link => link.addEventListener('click', () => {
  document.querySelectorAll('.admin-sidebar nav a').forEach(item => item.removeAttribute('aria-current'));
  link.setAttribute('aria-current', 'location');
  if (link.hash === '#maintenance') $<HTMLDetailsElement>('#maintenance').open = true;
}));
$('#new-category').addEventListener('click', () => openEditor('categories'));
const updateFilters = () => { pageNumber = 1; renderCatalog(); };
sectionFilter.addEventListener('change', updateFilters);
visibilityFilter.addEventListener('change', updateFilters);
searchInput.addEventListener('input', updateFilters);
$('#reset-filters').addEventListener('click', () => { searchInput.value = ''; visibilityFilter.value = ''; sectionFilter.value = ''; updateFilters(); searchInput.focus(); });
for (const [id, delta] of [['previous-page', -1], ['next-page', 1]] as const) {
  $(`#${id}`).addEventListener('click', () => { pageNumber += delta; renderCatalog(); $('#products-title').focus(); });
}
$('#new-product').addEventListener('click', () => {
  if (!categories.length) { message('Crea una categoría antes de crear productos.'); return; }
  openEditor('products');
});
$('#admin-panel').addEventListener('click', async event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (!target || busy) return;
  const [type, action] = target.dataset.action!.split(':') as ['categories' | 'products', string];
  const id = target.dataset.id!;
  if (action === 'edit') { openEditor(type, id); return; }
  const row = (type === 'categories' ? categories : products).find(row => row.id === id)!;
  if (action === 'delete' && type === 'categories' && products.some(p => p.category_id === id)) { message('No puedes eliminar una categoría con productos. Cámbialos de categoría primero.'); return; }
  if (action === 'delete' && !confirm(`¿Eliminar «${row.name}» y sus fotografías? Esta acción no se puede deshacer.`)) return;
  busy = true; target.disabled = true;
  try {
    const db = getSupabase();
    const result = action === 'delete' ? await db.from(type).delete().eq('id', id).eq('updated_at', row.updated_at).select('id') : await db.from(type).update({ active: !row.active }).eq('id', id).eq('updated_at', row.updated_at).select('id');
    if (result.error) throw result.error;
    if (!result.data.length) { await refresh(); message('El registro cambió. Revisa la lista actualizada.'); return; }
    let pending = 0;
    if (action === 'delete') {
      const paths = type === 'categories' ? [(row as Category).image_path].filter(Boolean) as string[] : ((row as Product).images as unknown as Photo[]).map(photo => photo.path);
      pending = await cleanPaths(paths);
    }
    await refresh(); message(pending ? 'Cambio guardado; hay fotografías pendientes de limpieza.' : 'Cambio guardado.');
  } catch (error) { message(friendlyError(error)); }
  finally { busy = false; target.disabled = false; }
});
$('#cleanup').addEventListener('click', async () => {
  if (busy) return; busy = true;
  try {
    const result = await getSupabase().from('image_cleanup').select('path').lt('created_at', new Date(Date.now() - 3600000).toISOString());
    if (result.error) throw result.error;
    const pending = await cleanPaths(result.data.map(row => row.path));
    message(pending ? `${pending} fotografías siguen pendientes. Intenta nuevamente más tarde.` : 'Limpieza completada.');
  } catch (error) { message(friendlyError(error)); } finally { busy = false; }
});
$('#logout').addEventListener('click', async () => {
  if (busy) return;
  try {
  const { error } = await getSupabase().auth.signOut();
  if (error) { message('No se pudo cerrar sesión. Intenta nuevamente.'); return; }
  location.replace('/admin/login/');
  } catch { message('No se pudo cerrar sesión. Revisa tu conexión e intenta nuevamente.'); }
});
async function init() {
  $('#retry-load').hidden = true;
  message('Comprobando acceso…');
  try {
    if (!await requireAdmin()) { location.replace('/admin/login/'); return; }
    await refresh(); $('#admin-panel').hidden = false; $('#logout').hidden = false; message('Catálogo listo para administrar.');
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { $('#admin-panel').hidden = true; dialog.close(); location.replace('/admin/login/'); }
    });
    window.addEventListener('pagehide', () => subscription.unsubscribe(), { once: true });
  } catch { message('No pudimos cargar tu catálogo. Revisa tu conexión y vuelve a intentar. Si continúa, contacta a quien administra tu sitio.'); $('#retry-load').hidden = false; }
}
$('#retry-load').addEventListener('click', () => { void init(); });
void init();

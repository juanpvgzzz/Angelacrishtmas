import { setSearchCatalog, setSearchUnavailable } from './predictive-search';
import { transitionContent } from './motion';
import { mountCatalog, matchesGroup } from './catalog-filters';
import { publicCatalog } from '../services/supabase/catalog';
import type { Product, Category, CatalogImage } from '../types/catalog';
import { formatPrice, availabilityLabels } from '../utils/format';
import { getWhatsAppUrl } from '../config/whatsapp';
import { brand } from '../config/brand';
import { sectionUrl, sectionName } from '../config/sections';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const e = escapeHtml;
const pendingImage = '/images/brand/image-pending.svg';
let catalogCategories: Category[] = [];
const detailUrl = (p: Product) => `/producto/?slug=${encodeURIComponent(p.slug)}`;
const categoryUrl = (c: Category) => `${sectionUrl(c.section || 'navidad')}?categoria=${encodeURIComponent(c.slug)}`;
const icon = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5ZM8 7.5c0 4 4.5 8.5 8.5 8.5l1-2-3-1.5-1 1c-1.5-.5-2.5-1.5-3-3l1-1L10 6.5l-2 1Z"/></svg>';
function whatsapp(p: Product) {
  const image = p.images[0];
  const imageUrl = image ? new URL(image.src, window.location.origin).href : undefined;
  const url = getWhatsAppUrl(p.name, undefined, imageUrl);
  const label = 'Cotizar por WhatsApp';
  return `<a class="button whatsapp-button button-primary whatsapp-solid" href="${e(url || '#contacto')}" ${url ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="${label}: ${e(p.name)}">${icon}<span>${label}</span></a>`;
}
function renderPrice(p: Product, detail = false) {
  if (p.basePrice === null) return '<p class="quote-price">Precio a cotizar</p>';
  return `<p class="${detail ? 'detail-price' : 'price'}">${p.priceFrom ? '<small>Desde </small>' : ''}${formatPrice(p.basePrice)} <small>COP</small></p>`;
}
function photo(image: CatalogImage | undefined, name: string, main = false) {
  return `<img ${main ? 'id="main-product-image" fetchpriority="high"' : 'loading="lazy"'} class="${!image || image.kind === 'placeholder' ? 'placeholder-image' : ''}" src="${e(image?.src || pendingImage)}" alt="${e(image?.alt || 'Fotografía pendiente: ' + name)}" width="600" height="720" decoding="async" />`;
}
function card(p: Product) {
  const mark = p.featured ? 'Destacado' : p.customizable ? 'Personalizable' : '';
  const star = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/></svg>';
  return `<article class="product-card"><div class="product-image">${photo(p.images[0], p.name)}<span class="card-quick-action" aria-hidden="true">Ver detalle <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></span>${mark ? `<span class="card-mark">${star}${mark}</span>` : ''}${!p.images[0] ? '<span class="image-caption">Fotografía pendiente</span>' : p.images[0].kind === 'placeholder' ? '<span class="image-caption">Imagen de muestra</span>' : ''}</div><div class="product-info"><p class="product-category">${e(catalogCategories.find(c => c.id === p.categoryId)?.name || '')}</p><h3><a class="product-detail-link" href="${detailUrl(p)}">${e(p.name)}</a></h3>${renderPrice(p)}<span class="availability availability-${p.availability}">${availabilityLabels[p.availability]}</span></div></article>`;
}
const grid = (products: Product[]) => products.length ? `<div class="product-grid">${products.map(card).join('')}</div>` : '<div class="empty-state"><h2>Nuevas creaciones en camino</h2><p>No hay productos disponibles en esta selección.</p></div>';
const detailIcon = (path: string) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}" /></svg>`;
const needle = detailIcon('m4 20 13-17c3-2 5 0 3 3L4 20Zm12-12 3-3M5 4c-4 0-4 6 0 6h3c6 0 2 8 8 8h4');
const heart = detailIcon('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z');
function renderProduct(root: HTMLElement, products: Product[], categories: Category[]) {
  const slug = new URLSearchParams(location.search).get('slug') || root.dataset.slug;
  const p = products.find(item => item.slug === slug);
  const category = categories.find(item => item.id === p?.categoryId);
  if (!p || !category) { root.innerHTML = '<div class="empty-state"><h1>Producto no disponible</h1><p>Este producto no está disponible en el catálogo.</p><a class="text-link" href="/catalogo/">Volver al catálogo</a></div>'; return; }
  const fixedQuote = document.querySelector<HTMLAnchorElement>('.mobile-quote a');
  if (fixedQuote) { fixedQuote.href = getWhatsAppUrl(p.name, undefined, p.images[0] ? new URL(p.images[0].src, location.origin).href : undefined) || '#contacto'; fixedQuote.setAttribute('aria-label', `Cotizar por WhatsApp: ${p.name}`); }
  document.title = `${p.name} | ${brand.name}`;
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(selector)?.setAttribute('content', document.title);
  for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(selector)?.setAttribute('content', p.shortDescription || brand.description);
  root.innerHTML = `<nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/catalogo/">Catálogo</a><span aria-hidden="true">/</span><a href="${sectionUrl(category.section || 'navidad')}">${sectionName(category.section || 'navidad')}</a><span aria-hidden="true">/</span><a href="${categoryUrl(category)}">${e(category.name)}</a><span aria-hidden="true">/</span><span aria-current="page">${e(p.name)}</span></nav>
  <div class="product-detail"><div class="product-gallery"><div class="gallery-main">${photo(p.images[0], p.name, true)}<span class="image-caption" data-gallery-caption ${p.images[0]?.kind === 'photo' ? 'hidden' : ''}>Imagen de muestra</span></div><div class="gallery-thumbnails" role="group" aria-label="Imágenes del producto">${p.images.length > 1 ? p.images.map((im, index) => `<button type="button" data-image="${index}" aria-label="Ver imagen ${index + 1} de ${e(p.name)}" aria-pressed="${index === 0}">${photo(im, '')}</button>`).join('') : ''}</div></div>
  <section class="product-detail-copy" aria-labelledby="product-title"><p class="eyebrow">${e(category.name)}</p><h1 id="product-title">${e(p.name)}</h1><p class="detail-status">${needle}${availabilityLabels[p.availability]}</p>${renderPrice(p, true)}<p style="white-space:pre-line">${e(p.description)}</p><dl class="product-facts"><div><dt>Tiempo estimado de elaboración</dt><dd>${e(p.productionTime || 'Consultar')}</dd></div><div><dt>Un detalle a tu medida</dt><dd>${p.customizable ? e(p.customizationOptions.join(' · ') || 'Personalizable: consulta las opciones disponibles.') : 'Sin personalización.'}</dd></div></dl>${whatsapp(p)}<p class="detail-help">Acordamos contigo el valor final, la disponibilidad y los detalles antes de comenzar.</p><div class="detail-purchase">${heart}<p>${e(brand.purchase)}</p></div></section></div>
  <section class="related-section" aria-labelledby="related-title"><div class="section-heading"><h2 id="related-title">También te pueden enamorar</h2></div>${grid(products.filter(item => item.categoryId === p.categoryId && item.id !== p.id).slice(0, 4))}</section>`;
  root.querySelectorAll<HTMLButtonElement>('[data-image]').forEach(button => button.addEventListener('click', () => {
    const im = p.images[Number(button.dataset.image)];
    const main = root.querySelector<HTMLImageElement>('#main-product-image')!;
    transitionContent(main, () => {
    main.src = im.src; main.alt = im.alt; main.classList.toggle('placeholder-image', im.kind === 'placeholder');
    root.querySelector<HTMLElement>('[data-gallery-caption]')!.hidden = im.kind === 'photo';
    }, true);
    root.querySelectorAll('[data-image]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));
}
async function load() {
  const roots = document.querySelectorAll<HTMLElement>('[data-live-catalog], [data-live-product], [data-live-collections]');
  if (!roots.length && !document.querySelector('[data-footer-collections]')) return;
  try {
    const { categories, products } = await publicCatalog();
    catalogCategories = categories;
    setSearchCatalog(products, categories);
    renderEditorial(categories, products);
    roots.forEach(root => {
      if (root.hasAttribute('data-live-product')) { renderProduct(root, products, categories); return; }
      if (root.hasAttribute('data-live-collections')) {
        root.innerHTML = categories.length ? `<div class="collection-grid">${categories.map(category => `<a class="collection-card" href="${categoryUrl(category)}"><div class="collection-image">${photo(category.image, category.name)}${category.image.kind === 'placeholder' ? '<span class="image-caption">Ilustración de muestra</span>' : ''}</div><div class="collection-copy"><h3>${e(category.name)}</h3><p>${e(category.description)}</p><span class="text-link">Explorar colección <span aria-hidden="true">↗</span></span></div></a>`).join('')}</div>` : '<div class="empty-state"><p>Estamos preparando nuestras colecciones. Vuelve pronto para descubrirlas.</p></div>';
        return;
      }
      if (root.dataset.featured !== 'true') { mountCatalog(root, products, categories, grid); return; }
      const slug = new URLSearchParams(location.search).get('categoria') || root.dataset.category;
      const section = root.dataset.section;
      const scopedCategories = categories.filter(item => !section || item.section === section);
      const visibleIds = new Set(scopedCategories.map(item => item.id));
      const category = scopedCategories.find(item => item.slug === slug);
      const selected = products.filter(item => visibleIds.has(item.categoryId) && (!slug || item.categoryId === category?.id));
      const tabs = `<nav class="category-tabs" aria-label="Filtrar catálogo por categoría"><a href="${section ? sectionUrl(section) : '/catalogo/'}" ${!slug ? 'aria-current="page"' : ''}>Ver todo</a>${scopedCategories.map(item => `<a href="${categoryUrl(item)}" ${item.slug === slug ? 'aria-current="page"' : ''}>${e(item.name)}</a>`).join('')}</nav>`;
      root.innerHTML = `${root.dataset.featured === 'true' ? '' : tabs}${grid(root.dataset.featured === 'true' ? selected.filter(item => item.featured).slice(0, 4) : selected)}`;
    });
    window.dispatchEvent(new Event('catalog:rendered'));
  } catch {
    setSearchUnavailable();
    roots.forEach(root => {
      root.innerHTML = `${root.hasAttribute('data-live-product') ? '<h1>Detalle del producto</h1>' : ''}<div class="empty-state"><p role="alert">No pudimos cargar el catálogo. Intenta nuevamente en unos momentos.</p><button type="button" class="button button-outline">Volver a intentar</button></div>`;
      root.querySelector('button')!.addEventListener('click', () => { void load(); });
    });
  }
}
void load();
window.addEventListener('pageshow', event => { if (event.persisted) void load(); });

// Las fotografías de portada y la colección de temporada siguen los destacados
// y su orden existentes; no requieren configuración ni esquema adicionales.
function renderEditorial(categories: Category[], products: Product[]) {
  document.querySelectorAll<HTMLElement>('[data-banner-art]').forEach(art => {
    const product = products.find(p => matchesGroup(p, categories, art.dataset.bannerArt!) && p.images.some(im => im.kind === 'photo'));
    const image = product?.images.find(im => im.kind === 'photo');
    if (image && product) art.innerHTML = photo(image, product.name, false);
  });
  const footer = document.querySelector('[data-footer-collections]');
  if (footer) footer.innerHTML = categories.map(c => `<a href="${categoryUrl(c)}">${e(c.name)}</a>`).join('') || '<a href="/catalogo/">Ver todas las creaciones</a>';
  const art = document.querySelector<HTMLElement>('[data-hero-art]');
  const realPhotos = products.filter(p => categories.find(c => c.id === p.categoryId)?.section !== 'navidad' && p.images.some(im => im.kind === 'photo')).sort((a, b) => Number(b.featured) - Number(a.featured));
  if (art && realPhotos.length) {
    // Una pieza por categoría prioriza variedad sin repetir la misma fotografía.
    const used = new Set<string>();
    const selection = realPhotos.filter(p => { if (used.has(p.categoryId)) return false; used.add(p.categoryId); return true; }).slice(0, 3);
    art.classList.add('has-photos');
    art.innerHTML = `<div class="hero-photo-composition" data-count="${selection.length}">${selection.map((p, i) => `<a href="${detailUrl(p)}" class="hero-photo hero-photo-${i}">${photo(p.images.find(im => im.kind === 'photo'), p.name).replace('loading="lazy"', i === 0 ? 'fetchpriority="high"' : 'loading="lazy"')}<span>${e(p.name)} <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`;
  }
  const seasonal = document.querySelector<HTMLElement>('[data-live-seasonal]');
  if (!seasonal) return;
  const featured = products.find(p => p.featured);
  const category = categories.find(c => c.id === featured?.categoryId);
  seasonal.hidden = !category;
  if (!category) return;
  const christmas = category.section === 'navidad';
  const image = featured?.images.find(im => im.kind === 'photo') || (christmas ? brand.seasonalImage : category.image);
  seasonal.classList.toggle('seasonal-christmas', christmas);
  seasonal.innerHTML = `<div class="seasonal-copy"><p class="eyebrow">UNA COLECCIÓN PARA CELEBRAR</p><h2 id="seasonal-title">${christmas ? 'Christmas Collection' : e(category.name)}</h2><p>${christmas ? 'La magia de la Navidad también tiene un lugar en ÁMELA. Descubre piezas hechas a mano para acompañar tus tradiciones.' : e(category.description)}</p><a class="text-link" href="${christmas ? sectionUrl(category.section!) : categoryUrl(category)}">${christmas ? 'Descubrir Navidad' : 'Explorar colección'} <span aria-hidden="true">↗</span></a></div><figure class="seasonal-art">${photo(image, category.name)}${image.kind === 'placeholder' ? '<figcaption>Ilustración de colección · Fotografía próximamente</figcaption>' : ''}</figure>`;
}

// También cubre imágenes de Storage que fallen después de renderizar la ficha.
document.addEventListener('error', event => {
  const img = event.target;
  if (!(img instanceof HTMLImageElement) || img.src.endsWith(pendingImage)) return;
  if (!img.closest('main')) return;
  img.src = pendingImage;
  img.alt = 'Fotografía no disponible';
  const frame = img.closest('.product-image, .gallery-main, .collection-image');
  if (frame) {
    let caption = frame.querySelector<HTMLElement>('.image-caption');
    if (!caption) { caption = document.createElement('span'); caption.className = 'image-caption'; frame.append(caption); }
    caption.hidden = false; caption.textContent = 'Fotografía no disponible';
  }
}, true);

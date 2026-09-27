import { catalogDefaults, type CatalogSettings } from '../config/catalog-settings';
import { createLocalSearch, normalizeSearch } from '../services/catalog-search';
import { transitionContent } from './motion';
import type { Product, Category } from '../types/catalog';
const queryHandlers = new WeakMap<HTMLElement, EventListener>();
export const normalize = normalizeSearch;
export function matchesGroup(p: Product, categories: Category[], group: string) {
  if (group === 'todo') return true;
  if (group === 'personalizados') return p.customizable;
  const c = categories.find(c => c.id === p.categoryId);
  const category = normalize(`${c?.name || ''} ${c?.slug || ''}`);
  const text = normalize(`${category} ${p.name} ${p.shortDescription}`);
  if (group === 'flores') return /flor|flores|ramo|rosa eterna/.test(text);
  if (group === 'munecas') return c?.section === 'munecas-de-trapo' || /muneca/.test(text);
  if (group === 'navidad') return c?.section === 'navidad' || /navid|noel|naviden/.test(text);
  if (group === 'decoracion') return /decor|adorno|corona|centro de mesa/.test(text);
  return false;
}
export function mountCatalog(root: HTMLElement, products: Product[], categories: Category[], grid: (products: Product[]) => string, settings: CatalogSettings = catalogDefaults) {
  const params = new URLSearchParams(location.search);
  let query = params.get('q') || '';
  const legacyGroup = params.get('grupo');
  let category = params.get('categoria') || root.dataset.category || '';
  const section = root.dataset.section;
  const scopedCategories = categories.filter(c => c.active && (!section || c.section === section)).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  // Old banner links resolve to an existing category, never a second filter.
  const bannerCategory = (group: string) => scopedCategories.find(c =>
    normalize(`${c.name} ${c.slug}`).includes(group === 'flores' ? 'flor' : group === 'navidad' ? 'navid' : group))?.slug || '';
  if (!category && legacyGroup && legacyGroup !== 'personalizados') category = bannerCategory(legacyGroup);
  if (!scopedCategories.some(c => c.slug === category)) category = '';
  const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const groups = [{ slug: '', name: settings.all_button_label }, ...scopedCategories];
  const ids = new Set(scopedCategories.map(c => c.id));
  const pool = products.filter(p => p.active && ids.has(p.categoryId)).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  root.innerHTML = `<div class="catalog-tools ${settings.show_category_buttons && settings.show_category_select ? 'adaptive-category-controls' : ''}"><div class="catalog-groups" role="group" aria-label="Filtrar por categoría" ${settings.show_category_buttons ? '' : 'hidden'}>${groups.map(g => `<button type="button" data-group="${escape(g.slug)}" aria-pressed="false">${escape(g.name)}</button>`).join('')}</div><div class="catalog-refinements"><label class="category-select" ${settings.show_category_select ? '' : 'hidden'}>${escape(settings.category_label)} <select aria-label="${escape(settings.category_label)}"><option value="">${escape(settings.all_categories_label)}</option></select></label><label class="personalized-filter" ${settings.show_customizable_filter ? '' : 'hidden'}><input type="checkbox" /> ${escape(settings.customizable_label)}</label></div></div><div class="catalog-results-heading"><p role="status" aria-live="polite" data-result-count></p><button class="clear-filters" type="button">Limpiar filtros</button></div><div data-results></div>`;
  const select = root.querySelector('select')!;
  scopedCategories.forEach(c => select.add(new Option(c.name, c.slug)));
  select.value = category;
  const personal = root.querySelector<HTMLInputElement>('.personalized-filter input')!;
  personal.checked = settings.show_customizable_filter && (legacyGroup === 'personalizados' || params.get('personalizable') === '1');
  const search = createLocalSearch(pool, scopedCategories);
  const inputs = document.querySelectorAll<HTMLInputElement>('[data-catalog-search]');
  const render = (updateUrl = true) => {
    const ranked = query.trim() ? search.rank(query).map(hit => hit.product) : pool;
    const filtered = ranked.filter(p => {
      const c = scopedCategories.find(c => c.id === p.categoryId);
      return (!category || c?.slug === category) && (!personal.checked || p.customizable);
    });
    inputs.forEach(input => { if (input.value !== query) input.value = query; });
    root.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === category)));
    root.querySelector('[data-result-count]')!.textContent = `${filtered.length} ${filtered.length === 1 ? 'creación' : 'creaciones'}${query.trim() ? ` para «${query.trim()}»` : ''}`;
    root.querySelector<HTMLElement>('.clear-filters')!.hidden = !(query || category || personal.checked);
    transitionContent(root.querySelector<HTMLElement>('[data-results]')!, () => {
    root.querySelector('[data-results]')!.innerHTML = filtered.length ? grid(filtered) : '<div class="empty-state"><h3>No encontramos creaciones en esta selección</h3><p>Prueba otra palabra o limpia los filtros para explorar el catálogo.</p><button type="button" class="button button-outline" data-reset>Ver todo</button></div>';
    root.querySelector('[data-reset]')?.addEventListener('click',reset);
    window.dispatchEvent(new Event('catalog:rendered'));
    });
    if (updateUrl) {
      const url = new URL(location.href);
      for (const [key,value] of [['q',query],['grupo',''],['categoria',category],['personalizable',personal.checked ? '1' : '']]) value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
      history.replaceState(null,'',url);
    }
    window.dispatchEvent(new Event('catalog:rendered'));
  };
  function reset() { query='';category='';select.value='';personal.checked=false;render(); }
  root.querySelector('.clear-filters')!.addEventListener('click',reset);
  root.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(button => button.addEventListener('click',()=>{category=button.dataset.group!;select.value=category;render();}));
  select.addEventListener('change',()=>{category=select.value;render();});
  personal.addEventListener('change',()=>render());
  // One listener per mounted catalog; replaced after a bfcache refresh.
  const previousHandler = queryHandlers.get(root);
  if (previousHandler) root.removeEventListener('catalog:query', previousHandler);
  const queryHandler: EventListener = event => {
    query = (event as CustomEvent<{query:string}>).detail.query;
    category='';select.value='';personal.checked=false;render();
  };
  queryHandlers.set(root, queryHandler);
  root.addEventListener('catalog:query', queryHandler);
  document.querySelectorAll<HTMLAnchorElement>('[data-banner-filter]').forEach(link=>link.onclick=event=>{
    event.preventDefault();const group=link.dataset.bannerFilter!;personal.checked=settings.show_customizable_filter && group==='personalizados';category=bannerCategory(group);select.value=category;query='';render();root.scrollIntoView({block:'start'});
  });
  render();
}

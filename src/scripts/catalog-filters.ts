import { createLocalSearch, normalizeSearch } from '../services/catalog-search';
import { transitionContent } from './motion';
import type { Product, Category } from '../types/catalog';
const queryHandlers = new WeakMap<HTMLElement, EventListener>();
export const normalize = normalizeSearch;
export const groups = [{ id: 'todo', name: 'Todo' }, { id: 'flores', name: 'Flores eternas' }, { id: 'munecas', name: 'Muñecas' }, { id: 'decoracion', name: 'Decoración' }, { id: 'navidad', name: 'Navidad' }];
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
export function mountCatalog(root: HTMLElement, products: Product[], categories: Category[], grid: (products: Product[]) => string) {
  const params = new URLSearchParams(location.search);
  let query = params.get('q') || '';
  let group = params.get('grupo') || 'todo';
  if (![...groups.map(g => g.id), 'personalizados'].includes(group)) group = 'todo';
  let category = params.get('categoria') || root.dataset.category || '';
  const section = root.dataset.section;
  const scopedCategories = categories.filter(c => !section || c.section === section);
  const ids = new Set(scopedCategories.map(c => c.id));
  const pool = products.filter(p => ids.has(p.categoryId));
  root.innerHTML = `<div class="catalog-tools"><div class="catalog-groups" role="group" aria-label="Filtrar por colección">${groups.map(g => `<button type="button" data-group="${g.id}" aria-pressed="false">${g.name}</button>`).join('')}</div><div class="catalog-refinements"><label>Categoría <select aria-label="Categoría del catálogo"><option value="">Todas las categorías</option></select></label><label class="personalized-filter"><input type="checkbox" /> Solo personalizables</label></div></div><div class="catalog-results-heading"><p role="status" aria-live="polite" data-result-count></p><button class="clear-filters" type="button">Limpiar filtros</button></div><div data-results></div>`;
  const select = root.querySelector('select')!;
  scopedCategories.forEach(c => select.add(new Option(c.name, c.slug)));
  select.value = category;
  const personal = root.querySelector<HTMLInputElement>('.personalized-filter input')!;
  personal.checked = group === 'personalizados';
  if (personal.checked) group = 'todo';
  const search = createLocalSearch(pool, scopedCategories);
  const inputs = document.querySelectorAll<HTMLInputElement>('[data-catalog-search]');
  const render = (updateUrl = true) => {
    const ranked = query.trim() ? search.rank(query).map(hit => hit.product) : pool;
    const filtered = ranked.filter(p => {
      const c = scopedCategories.find(c => c.id === p.categoryId);
      return (!category || c?.slug === category) && matchesGroup(p, categories, group) && (!personal.checked || p.customizable);
    });
    inputs.forEach(input => { if (input.value !== query) input.value = query; });
    root.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === group)));
    root.querySelector('[data-result-count]')!.textContent = `${filtered.length} ${filtered.length === 1 ? 'creación' : 'creaciones'}${query.trim() ? ` para «${query.trim()}»` : ''}`;
    root.querySelector<HTMLElement>('.clear-filters')!.hidden = !(query || category || group !== 'todo' || personal.checked);
    transitionContent(root.querySelector<HTMLElement>('[data-results]')!, () => {
    root.querySelector('[data-results]')!.innerHTML = filtered.length ? grid(filtered) : '<div class="empty-state"><h3>No encontramos creaciones en esta selección</h3><p>Prueba otra palabra o limpia los filtros para explorar el catálogo.</p><button type="button" class="button button-outline" data-reset>Ver todo</button></div>';
    root.querySelector('[data-reset]')?.addEventListener('click',reset);
    window.dispatchEvent(new Event('catalog:rendered'));
    });
    if (updateUrl) {
      const url = new URL(location.href);
      for (const [key,value] of [['q',query],['grupo',group === 'todo' ? '' : group],['categoria',category],['personalizable',personal.checked ? '1' : '']]) value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
      history.replaceState(null,'',url);
    }
    window.dispatchEvent(new Event('catalog:rendered'));
  };
  function reset() { query='';group='todo';category='';select.value='';personal.checked=false;render(); }
  personal.checked ||= params.get('personalizable') === '1';
  root.querySelector('.clear-filters')!.addEventListener('click',reset);
  root.querySelectorAll<HTMLButtonElement>('[data-group]').forEach(button => button.addEventListener('click',()=>{group=button.dataset.group!;category='';select.value='';render();}));
  select.addEventListener('change',()=>{category=select.value;render();});
  personal.addEventListener('change',()=>render());
  // One listener per mounted catalog; replaced after a bfcache refresh.
  const previousHandler = queryHandlers.get(root);
  if (previousHandler) root.removeEventListener('catalog:query', previousHandler);
  const queryHandler: EventListener = event => {
    query = (event as CustomEvent<{query:string}>).detail.query;
    group='todo';category='';select.value='';personal.checked=false;render();
  };
  queryHandlers.set(root, queryHandler);
  root.addEventListener('catalog:query', queryHandler);
  document.querySelectorAll<HTMLAnchorElement>('[data-banner-filter]').forEach(link=>link.onclick=event=>{
    event.preventDefault();group=link.dataset.bannerFilter!;personal.checked=group==='personalizados';if(personal.checked)group='todo';category='';select.value='';query='';render();root.scrollIntoView({block:'start'});
  });
  render(false);
}

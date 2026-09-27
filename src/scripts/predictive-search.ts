import type { Category, Product } from '../types/catalog';
import { createLocalSearch, type SearchProvider, type SearchHit } from '../services/catalog-search';
import { getWhatsAppUrl } from '../config/whatsapp';
import { formatPrice } from '../utils/format';

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const panel = document.querySelector<HTMLElement>('#search-suggestions');
const modalInput = document.querySelector<HTMLInputElement>('[data-search-dialog-input]');
const fields = Array.from(document.querySelectorAll<HTMLInputElement>('[data-catalog-search]'));
const mobile = matchMedia('(max-width: 767px)');
let provider: SearchProvider | undefined;
let categories: Category[] = [];
let unavailable = false;
let currentInput: HTMLInputElement | undefined;
let returnFocus: HTMLElement | null = null;
let active = -1;
let timer: ReturnType<typeof setTimeout> | undefined;
let revision = 0;
let opened = false;
let renderedQuery: string | undefined;
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const resultUrl = (q: string) => `/catalogo/?q=${encodeURIComponent(q)}#creaciones`;
const options = () => Array.from(panel?.querySelectorAll<HTMLAnchorElement>('[role="option"]') || []);

export function setSearchCatalog(products: Product[], visibleCategories: Category[]) {
  categories = visibleCategories.filter(c => c.active);
  provider = createLocalSearch(products, categories);
  unavailable = false;
  if (opened && currentInput) void suggest(currentInput.value);
}
export function setSearchUnavailable() {
  unavailable = true;
  if (opened && currentInput) void suggest(currentInput.value);
}
function position() {
  if (!opened || !panel || !currentInput) return;
  if (dialog?.open) {
    dialog.style.height = (window.visualViewport?.height || innerHeight) + 'px';
    dialog.style.top = (window.visualViewport?.offsetTop || 0) + 'px';
    return;
  }
  const rect = currentInput.closest('form')!.getBoundingClientRect();
  panel.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - rect.width - 12))}px`;
  panel.style.top = `${rect.bottom + 8}px`;
  panel.style.width = `${Math.min(rect.width, innerWidth - 24)}px`;
  panel.style.maxHeight = `${Math.max(100, innerHeight - rect.bottom - 24)}px`;
}
function choose(index: number) {
  const list = options();
  active = Math.max(-1, Math.min(index, list.length - 1));
  list.forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
  if (active >= 0) { currentInput?.setAttribute('aria-activedescendant', list[active].id); list[active].scrollIntoView({ block:'nearest', behavior:'instant' }); }
  else currentInput?.removeAttribute('aria-activedescendant');
}
function close(restore = false) {
  opened = false;
  revision++;
  clearTimeout(timer);
  if (panel) panel.hidden = true;
  [...fields, ...(modalInput ? [modalInput] : [])].forEach(input => { input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); });
  if (dialog?.open) dialog.close();
  document.body.classList.remove('search-is-open');
  if (restore && returnFocus) returnFocus.focus({ preventScroll:true });
}
function applyQuery(q: string) {
  if (['/', '/catalogo/'].includes(location.pathname)) {
    const url = new URL(location.href);
    q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
    for (const key of ['grupo', 'categoria', 'personalizable']) url.searchParams.delete(key);
    history.replaceState(null, '', url);
  }
  document.querySelectorAll<HTMLElement>('[data-live-catalog]').forEach(root => root.dispatchEvent(new CustomEvent('catalog:query', { detail: { query:q } })));
}
function submit(q: string) {
  clearTimeout(timer);
  if (document.querySelector('[data-live-catalog]') && ['/', '/catalogo/'].includes(location.pathname)) {
    applyQuery(q);
    close();
    const root = document.querySelector<HTMLElement>('[data-live-catalog]')!;
    root.tabIndex = -1;
    root.focus({preventScroll:true});
    root.scrollIntoView({block:'start'});
  } else location.assign(resultUrl(q));
}
async function suggest(query: string) {
  if (!panel || !currentInput) return;
  const ticket = ++revision;
  const q = query.trim().slice(0,160);
  const heading = panel.querySelector<HTMLElement>('[data-search-heading]')!;
  const status = panel.querySelector<HTMLElement>('[data-search-status]')!;
  const list = panel.querySelector<HTMLElement>('#search-options')!;
  const empty = panel.querySelector<HTMLElement>('[data-search-empty]')!;
  let hits: SearchHit[] = [];
  try { if (provider) hits = await provider.search(q); }
  catch { unavailable = true; }
  if (ticket !== revision || !opened) return;
  renderedQuery = q;
  list.inert = false;
  panel.setAttribute('aria-busy','false');
  choose(-1);
  list.innerHTML = ''; empty.innerHTML = '';
  heading.textContent = q ? 'Creaciones para ti' : 'Para inspirarte';
  if (!provider && !unavailable) { status.textContent = 'Estamos preparando las sugerencias…'; return; }
  if (unavailable) { status.textContent = 'Ahora no podemos mostrar sugerencias. Puedes escribirnos y te ayudamos a elegir.'; }
  else status.textContent = q ? `${hits.length} ${hits.length === 1 ? 'coincidencia' : 'coincidencias'}` : 'Explora nuestras categorías y destacados';
  const productOptions = hits.slice(0,q ? 6 : 4).map(hit => ({
    href:`/producto/?slug=${encodeURIComponent(hit.product.slug)}`,
    html:`<img src="${esc(hit.product.images[0]?.src || '/images/brand/image-pending.svg')}" alt="" width="52" height="62" /><span class="suggestion-copy"><strong>${esc(hit.product.name)}</strong><small>${esc(hit.category.name)}</small>${hit.product.basePrice !== null ? `<span class="suggestion-price">${hit.product.priceFrom ? 'Desde ' : ''}${esc(formatPrice(hit.product.basePrice))}</span>` : ''}</span>`,
  }));
  if (!q && !unavailable) for (const category of categories.slice(0, Math.max(0,6-productOptions.length))) productOptions.push({href:`/catalogo/?categoria=${encodeURIComponent(category.slug)}#creaciones`,html:`<span class="suggestion-category-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/></svg></span><span class="suggestion-copy"><strong>${esc(category.name)}</strong><small>Explorar categoría</small></span>`});
  if (!unavailable) productOptions.forEach((option,i) => {
    const link = document.createElement('a');
    link.id=`search-option-${i}`; link.href=option.href;link.role='option';link.tabIndex=-1;link.className='search-option';link.setAttribute('aria-selected','false');link.innerHTML=option.html;
    link.querySelector('img')?.addEventListener('error',event=>{const img=event.target as HTMLImageElement;if(!img.src.endsWith('/image-pending.svg'))img.src='/images/brand/image-pending.svg';});
    list.append(link);
  });
  if (q) {
    const all = document.createElement('a');all.href=resultUrl(q);all.role='option';all.tabIndex=-1;all.id='search-option-all';all.className='search-option search-all';all.setAttribute('aria-selected','false');all.textContent=`Ver todos los resultados para: ${q}`;
    all.addEventListener('click',event=>{event.preventDefault();submit(q);});list.append(all);
  }
  if ((!hits.length && q) || unavailable) {
    const prompt=document.createElement('p');prompt.textContent=unavailable?'Cuéntanos qué estás buscando.':`No encontramos ‘${q}’. ¿Quieres crear algo personalizado?`;
    const contact=document.createElement('a');contact.className='button button-outline';contact.href=getWhatsAppUrl(undefined,`Hola, quisiera crear algo personalizado en ÁMELA${q ? `: ${q}` : '.'}`)||'#contacto';contact.target='_blank';contact.rel='noopener noreferrer';contact.textContent='Crear algo por WhatsApp';empty.append(prompt,contact);
  }
  position();
}
function open(input: HTMLInputElement) {
  if (!panel || !dialog || !modalInput) return;
  returnFocus = document.activeElement as HTMLElement;
  opened = true;
  if (mobile.matches) {
    const q = input.value;
    document.querySelector<HTMLDetailsElement>('.mobile-menu')?.removeAttribute('open');
    dialog.querySelector('[data-search-dialog-results]')!.append(panel);
    currentInput = modalInput;modalInput.value = q;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('search-is-open');
    modalInput.focus({preventScroll:true});
  } else {
    document.body.append(panel);currentInput=input;
  }
  panel.hidden=false;
  currentInput.setAttribute('aria-expanded','true');
  position();void suggest(currentInput.value);
}
if (panel && dialog && modalInput) {
  for (const input of [...fields,modalInput]) {
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','search-options');input.setAttribute('aria-expanded','false');input.maxLength=160;
    input.value=new URLSearchParams(location.search).get('q')||'';
    // A click/tap opens the mobile dialog without trapping restored keyboard focus.
    if(input!==modalInput) {
      input.addEventListener('focus',()=>{if(!mobile.matches)open(input);});
      input.addEventListener('click',()=>{if(mobile.matches)open(input);});
    }
    input.addEventListener('input',()=>{
      clearTimeout(timer);revision++;choose(-1);
      renderedQuery = undefined;
      panel.setAttribute('aria-busy','true');
      panel.querySelector<HTMLElement>('#search-options')!.inert = true;
      if(!opened && input!==modalInput)open(input);
      const q=input.value;
      timer=setTimeout(()=>{timer=undefined;if(!opened)return;void suggest(q);if(['/', '/catalogo/'].includes(location.pathname))applyQuery(q);},180);
    });
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape') {event.preventDefault();event.stopPropagation();close(true);return;}
      if(event.key==='ArrowDown'||event.key==='ArrowUp') {
        event.preventDefault();if(!opened)open(input);
        const next=active+(event.key==='ArrowDown'?1:-1);
        if(renderedQuery!==input.value.trim()) {
          clearTimeout(timer);const q=input.value;
          void suggest(q).then(()=>{if(opened && currentInput===input && input.value===q)choose(next);});
        } else choose(next);
      }
      if(event.key==='Enter') {event.preventDefault();if(mobile.matches&&!opened&&input!==modalInput){open(input);return;}if(active>=0 && renderedQuery===input.value.trim())options()[active]?.click();else submit(input.value);}
    });
    input.form?.addEventListener('submit',event=>{event.preventDefault();submit(input.value);});
  }
  document.querySelector('.header-search-toggle')?.addEventListener('click',event=>{event.preventDefault();open(fields.find(input=>input.closest('.mobile-search')) || fields[0]);});
  dialog.querySelector('.search-close')?.addEventListener('click',()=>close(true));
  dialog.addEventListener('cancel',event=>{event.preventDefault();close(true);});
  document.addEventListener('pointerdown',event=>{if(!dialog.open && opened && event.target instanceof Node && !panel.contains(event.target) && !currentInput?.closest('form')?.contains(event.target))close();});
  document.addEventListener('focusin',event=>{if(!dialog.open && opened && event.target instanceof Node && event.target!==currentInput && !panel.contains(event.target))close();});
  let positionQueued = false;
  const queuePosition = () => {
    if (!opened || positionQueued) return;
    positionQueued = true;
    requestAnimationFrame(() => { positionQueued = false; position(); });
  };
  window.addEventListener('scroll',queuePosition,{passive:true});
  window.addEventListener('resize',queuePosition,{passive:true});
  window.visualViewport?.addEventListener('resize',queuePosition,{passive:true});
  window.visualViewport?.addEventListener('scroll',queuePosition,{passive:true});
  document.querySelector('.site-header')?.addEventListener('transitionend',queuePosition);
  mobile.addEventListener('change',()=>close());
}

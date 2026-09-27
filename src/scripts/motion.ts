// Progressive enhancement: content stays usable when motion or JavaScript is unavailable.
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const active = new Set<Animation>();
const seen = new WeakSet<Element>();
const pending = new Set<HTMLElement>();
const swaps = new WeakMap<HTMLElement, { animation: Animation | null }>();
const ease = 'cubic-bezier(.22, 1, .36, 1)';

function animate(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (preference.matches || !element.animate) return null;
  const animation = element.animate(frames, { easing: ease, ...options });
  active.add(animation);
  animation.finished.then(() => active.delete(animation), () => active.delete(animation));
  return animation;
}

/** Last interaction wins, including typing or choosing gallery thumbnails rapidly. */
export function transitionContent(element: HTMLElement, update: () => void, gallery = false) {
  const previous = swaps.get(element);
  const current = { animation: null as Animation | null };
  swaps.set(element, current);
  previous?.animation?.cancel();
  const commit = () => {
    if (swaps.get(element) !== current || !element.isConnected) return;
    element.inert = false;
    update();
    if (gallery) current.animation = animate(element, [{ opacity: 0, transform: 'translateX(6px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240 });
    else current.animation = null;
    const done = () => { if (swaps.get(element) === current) swaps.delete(element); };
    if (current.animation) void current.animation.finished.then(done, done);
    else done();
  };
  if (preference.matches || (!gallery && !element.children.length)) { commit(); return; }
  // Prevent activation of a departing product; scrolling and filter controls remain free.
  if (!gallery) element.inert = true;
  current.animation = animate(element, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: `translateY(${gallery ? 0 : -5}px)` }], { duration: 120, easing: 'ease-out' });
  if (current.animation) void current.animation.finished.then(commit, () => {});
  else commit();
}

function reveal(element: HTMLElement) {
  pending.delete(element);
  element.classList.remove('motion-pending');
  animate(element, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 520, delay: Number(element.dataset.motionDelay || 0), fill: 'backwards' });
}
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    observer?.unobserve(entry.target);
    reveal(entry.target as HTMLElement);
  }
}, { threshold: 0.06 }) : null;

function discover() {
  if (!document.body.classList.contains('public-store')) return;
  for (const element of pending) if (!element.isConnected) { observer?.unobserve(element); pending.delete(element); }
  document.querySelectorAll<HTMLElement>('.shop-heading, .catalog-tools, .catalog-results-heading, .shop-note, .product-card, .related-section .section-heading, .product-detail-copy > *, .product-gallery').forEach(element => {
    if (seen.has(element)) return;
    seen.add(element);
    if (preference.matches || !observer) return;
    const siblings = element.classList.contains('product-card') ? Array.from(element.parentElement!.children) : [];
    element.dataset.motionDelay = String((Math.max(0, siblings.indexOf(element)) % 4) * 55);
    element.classList.add('motion-pending');
    pending.add(element);
    observer.observe(element);
  });
}

if (document.body.classList.contains('public-store')) {
  document.querySelectorAll<HTMLElement>('.catalog-banner:first-child .banner-copy > *').forEach((element, index) => {
    animate(element, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 600, delay: index * 85, fill: 'backwards' });
  });
  const art = document.querySelector<HTMLElement>('.catalog-banner:first-child .banner-visual');
  if (art) animate(art, [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 680, delay: 130, fill: 'backwards' });
  const header = document.querySelector<HTMLElement>('.site-header');
  let queued = false;
  const compact = () => {
    // Hysteresis avoids flickering at the boundary. Layout height stays stable.
    if (scrollY > 90) header?.classList.add('is-compact');
    else if (scrollY < 30) header?.classList.remove('is-compact');
    queued = false;
  };
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(compact); } }, { passive: true });
  compact();
  discover();
  window.addEventListener('catalog:rendered', discover);
  document.addEventListener('focusin', event => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest<HTMLElement>('.motion-pending');
    if (element) { observer?.unobserve(element); pending.delete(element); element.classList.remove('motion-pending'); }
  });
}
preference.addEventListener('change', () => {
  if (!preference.matches) return;
  for (const animation of active) { try { animation.finish(); } catch { animation.cancel(); } }
  for (const element of pending) { element.classList.remove('motion-pending'); observer?.unobserve(element); }
  pending.clear();
});

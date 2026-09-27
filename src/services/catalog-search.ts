import type { Category, Product } from '../types/catalog';

export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
export interface SearchHit { product: Product; category: Category; score: number; }
// A remote Supabase adapter can implement this contract without changing the UI.
export interface SearchProvider { search(query: string): Promise<SearchHit[]>; }
const related = [
  ['flor', 'flores', 'ramo', 'rosa', 'rosas', 'eternas'],
  ['muneca', 'munecas', 'personaje', 'amigurumi'],
  ['navidad', 'navideno', 'navidena', 'arbol', 'corona', 'temporada'],
  ['regalo', 'personalizado', 'personalizable', 'detalle'],
];
function distance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
  }
  return rows[a.length][b.length];
}
export function createLocalSearch(products: Product[], categories: Category[]) {
  const visibleCategories = new Map(categories.filter(c => c.active).map(c => [c.id, c]));
  const entries = products.filter(p => p.active && visibleCategories.has(p.categoryId)).map(product => {
    const category = visibleCategories.get(product.categoryId)!;
    const name = normalizeSearch(product.name);
    const categoryText = normalizeSearch(`${category.name} ${category.slug}`);
    const description = normalizeSearch(`${product.shortDescription} ${product.description} ${category.description} ${product.customizationOptions.join(' ')}`);
    const identity = `${name} ${categoryText}`;
    const aliases = [
      /flor|ramo|rosa/.test(identity) ? related[0] : [],
      category.section === 'munecas-de-trapo' || /muneca|amigurumi|personaje/.test(identity) ? related[1] : [],
      category.section === 'navidad' || /navid|noel|arbol|corona|temporada/.test(identity) ? related[2] : [],
      product.customizable || /regalo|personaliz|detalle/.test(identity) ? related[3] : [],
    ].flat();
    const words = [...new Set(`${identity} ${description}`.split(' '))];
    return { product, category, name, categoryText, description, aliases, words };
  });
  function rank(query: string): SearchHit[] {
    const q = normalizeSearch(query).slice(0, 160);
    if (!q) return entries.filter(e => e.product.featured).map(e => ({ product: e.product, category: e.category, score: 0 }));
    const terms = q.split(' ').slice(0, 12);
    return entries.flatMap(entry => {
      let score: number;
      if (entry.name.startsWith(q)) score = 0;
      else if (entry.name.includes(q)) score = 1;
      else if (terms.every(t => entry.categoryText.includes(t))) score = 2;
      else if (terms.every(t => `${entry.name} ${entry.categoryText} ${entry.description}`.includes(t))) score = 3;
      else {
        const matches = terms.map(term => {
          if (`${entry.name} ${entry.categoryText} ${entry.description}`.includes(term)) return 0;
          if (term.length >= 2 && entry.aliases.some(alias => alias.startsWith(term) || term === alias)) return 1;
          if (term.length < 4 || term.length > 32) return -1;
          const limit = term.length >= 7 ? 2 : 1;
          return [...entry.words, ...entry.aliases].some(word => Math.abs(word.length - term.length) <= limit && distance(word, term) <= limit) ? 2 : -1;
        });
        if (matches.some(n => n < 0)) return [];
        score = matches.includes(2) ? 5 : 4;
      }
      return [{ product: entry.product, category: entry.category, score }];
    }).sort((a, b) => a.score - b.score || Number(b.product.featured) - Number(a.product.featured) || a.product.order - b.product.order);
  }
  return { rank, search: async (query: string) => rank(query) } satisfies SearchProvider & { rank: typeof rank };
}

import { getSupabase } from './client';
import { readAll } from './read-all';
import type { CatalogSection } from '../../config/sections';
import type { CatalogImage, Category, Product } from '../../types/catalog';
import type { Database } from '../../types/database';
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];

export function imageUrl(path: string) {
  if (/^\/images\/placeholders\/[a-z-]+\.svg$/.test(path)) return path;
  return getSupabase().storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
export function toCategory(row: CategoryRow): Category {
  return { id: row.id, section: row.section as CatalogSection, name: row.name, slug: row.slug, description: row.description || '',
    order: row.sort_order, active: row.active, image: { kind: !row.image_path || row.image_path.startsWith('/images/placeholders/') ? 'placeholder' : 'photo',
      src: row.image_path ? imageUrl(row.image_path) : '/images/brand/image-pending.svg', alt: row.name, width: 600, height: 720 } };
}
export function toProduct(row: ProductRow): Product {
  const images = (Array.isArray(row.images) ? row.images : []) as unknown as (CatalogImage & { path: string })[];
  return { id: row.id, categoryId: row.category_id, name: row.name, slug: row.slug,
    shortDescription: row.short_description, description: row.description, basePrice: row.price,
    priceFrom: row.price_from, currency: 'COP', customizable: row.customizable,
    availability: row.availability === 'made_to_order' ? 'under-order' : row.availability === 'sold_out' ? 'unavailable' : 'available',
    productionTime: row.production_time, customizationOptions: row.customizable ? row.customization_options : [],
    featured: row.featured, active: row.active, order: row.sort_order, createdAt: row.created_at,
    images: images.map(image => ({ ...image, src: imageUrl(image.path) })) };
}
export async function publicCatalog() {
  const db = getSupabase();
  const [categories, products] = await Promise.all([
    readAll((from, to) => db.from('categories').select('*').eq('active', true).order('sort_order').order('name').order('id').range(from, to)),
    readAll((from, to) => db.from('products').select('*').eq('active', true).order('sort_order').order('name').order('id').range(from, to)),
  ]);
  const visible = new Set(categories.map(row => row.id));
  return { categories: categories.map(toCategory), products: products.filter(row => visible.has(row.category_id)).map(toProduct) };
}
export async function requireAdmin() {
  const db = getSupabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return false;
  const membership = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  return !membership.error && Boolean(membership.data);
}

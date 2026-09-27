import { writeFileSync, mkdirSync } from 'node:fs';
import { categories } from '../src/data/categories.ts';
import { products } from '../src/data/products.ts';
const sql = (value: string) => `'${value.replaceAll("'", "''")}'`;
const output = ['-- Importación manual de demostración. Todo queda OCULTO hasta revisión.', 'begin;', 'do $import$', 'begin', "if exists(select 1 from private.catalog_imports where name = 'demo-v1') then raise notice 'La demostración ya se importó'; return; end if;"];
for (const c of categories) output.push(`insert into public.categories(name, slug, description, image_path, active, sort_order) values (${sql(c.name)}, ${sql(c.slug)}, ${sql(c.description)}, ${sql(c.image.src)}, false, ${c.order}) on conflict (slug) do nothing;`);
for (const p of products) {
  const category = categories.find(c => c.id === p.categoryId)!;
  const images = p.images.map(({ src, ...image }) => ({ ...image, path: src }));
  output.push(`insert into public.products(category_id, name, slug, short_description, description, price, price_from, availability, production_time, customizable, customization_options, featured, active, sort_order, images) values ((select id from public.categories where slug = ${sql(category.slug)}), ${sql(p.name)}, ${sql(p.slug)}, ${sql(p.shortDescription)}, ${sql(p.description)}, ${p.basePrice}, ${p.priceFrom}, ${sql(p.availability === 'under-order' ? 'made_to_order' : p.availability === 'unavailable' ? 'sold_out' : 'available')}, ${sql(p.productionTime)}, ${p.customizationOptions.length > 0}, array[${p.customizationOptions.map(sql).join(',')} ]::text[], ${p.featured}, false, ${p.order}, ${sql(JSON.stringify(images))}::jsonb) on conflict (slug) do nothing;`);
}
output.push("insert into private.catalog_imports(name) values ('demo-v1');", 'end;', '$import$;', 'commit;', '');
mkdirSync('supabase/seeds', { recursive: true });
writeFileSync('supabase/seeds/demo.sql', output.join('\n'));
console.log('Preparado supabase/seeds/demo.sql. No se ha conectado ni modificado ninguna base de datos.');

-- Catálogo administrativo. Sin servicios de pago ni extensiones adicionales.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy admin_own_membership on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- Invoker: la consulta solo ve la propia membresía mediante RLS, sin recursión.
create function private.is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select exists(select 1 from public.admin_users where user_id = (select auth.uid())); $$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  slug text not null unique check (length(slug) <= 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (length(description) <= 12000),
  image_path text,
  active boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_image_path check (image_path is null or
    image_path ~ ('^categories/' || id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$') or
    image_path ~ '^/images/placeholders/[a-z-]+\.svg$')
);

create function private.valid_images(images jsonb, product_id uuid) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare image jsonb; paths text[] := '{}'; path text;
begin
  if jsonb_typeof(images) <> 'array' then return false; end if;
  if jsonb_array_length(images) > 12 then return false; end if;
  for image in select value from jsonb_array_elements(images) loop
    if jsonb_typeof(image) <> 'object' or not (image ?& array['path','kind','alt','width','height']) then return false; end if;
    path := image->>'path';
    if jsonb_typeof(image->'kind') <> 'string' or jsonb_typeof(image->'path') <> 'string' or jsonb_typeof(image->'alt') <> 'string'
      or length(image->>'alt') > 300 or jsonb_typeof(image->'width') <> 'number'
      or jsonb_typeof(image->'height') <> 'number' then return false; end if;
    if (image->>'width')::numeric <= 0 or (image->>'height')::numeric <= 0 then return false; end if;
    if not ((image->>'kind' = 'photo' and path ~ ('^products/' || product_id::text || '/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'))
      or (image->>'kind' = 'placeholder' and path ~ '^/images/placeholders/[a-z-]+\.svg$')) then return false; end if;
    if path = any(paths) then return false; end if;
    paths := array_append(paths, path);
  end loop;
  return true;
end; $$;
revoke all on function private.valid_images(jsonb, uuid) from public;
grant execute on function private.valid_images(jsonb, uuid) to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  slug text not null unique check (length(slug) <= 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '' check (length(short_description) <= 500),
  description text not null default '' check (length(description) <= 12000),
  price numeric(12,2) not null default 0 check (price >= 0 and price < 10000000000),
  price_from boolean not null default false,
  currency text not null default 'COP' check (currency = 'COP'),
  availability text not null default 'made_to_order' check (availability in ('available', 'made_to_order', 'sold_out')),
  production_time text not null default '' check (length(production_time) <= 300),
  customizable boolean not null default false,
  customization_options text[] not null default '{}' check (cardinality(customization_options) <= 100),
  featured boolean not null default false,
  active boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  images jsonb not null default '[]' check (private.valid_images(images, id)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_active_order_idx on public.categories(active, sort_order);
create index products_category_order_idx on public.products(category_id, sort_order);
create index products_active_order_idx on public.products(active, sort_order);
create index products_featured_order_idx on public.products(featured, sort_order) where active;

create function private.touch_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end; $$;
revoke all on function private.touch_updated_at() from public;
create trigger categories_updated_at before update on public.categories for each row execute function private.touch_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.touch_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
revoke all on public.categories, public.products from anon, authenticated;
grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
create policy categories_public_read on public.categories for select to anon, authenticated using (active);
create policy products_public_read on public.products for select to anon, authenticated
  using (active and exists (select 1 from public.categories c where c.id = category_id and c.active));
create policy categories_admin_read on public.categories for select to authenticated using ((select private.is_admin()));
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated using ((select private.is_admin()));
create policy products_admin_read on public.products for select to authenticated using ((select private.is_admin()));
create policy products_admin_insert on public.products for insert to authenticated with check ((select private.is_admin()));
create policy products_admin_update on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy products_admin_delete on public.products for delete to authenticated using ((select private.is_admin()));

-- Registro durable previo a cada carga y para archivos retirados. Reintentos manuales seguros.
create table public.image_cleanup (
  path text primary key check (path ~ '^(products|categories)/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'),
  created_at timestamptz not null default now()
);
alter table public.image_cleanup enable row level security;
revoke all on public.image_cleanup from anon, authenticated;
grant select, insert, delete on public.image_cleanup to authenticated;
create policy cleanup_admin_read on public.image_cleanup for select to authenticated using ((select private.is_admin()));
create policy cleanup_admin_insert on public.image_cleanup for insert to authenticated with check ((select private.is_admin()));
create policy cleanup_admin_delete on public.image_cleanup for delete to authenticated using ((select private.is_admin()));
create index image_cleanup_created_at_idx on public.image_cleanup(created_at);

create table private.catalog_imports (name text primary key, created_at timestamptz not null default now());
alter table private.catalog_imports enable row level security;
revoke all on private.catalog_imports from public, anon, authenticated;

create function private.queue_images() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare old_paths text[] := '{}'; new_paths text[] := '{}'; path text;
begin
  if tg_table_name = 'products' then
    if tg_op <> 'INSERT' then select coalesce(array_agg(value->>'path'), '{}') into old_paths from jsonb_array_elements(old.images); end if;
    if tg_op <> 'DELETE' then select coalesce(array_agg(value->>'path'), '{}') into new_paths from jsonb_array_elements(new.images); end if;
  else
    if tg_op <> 'INSERT' and old.image_path is not null then old_paths := array[old.image_path]; end if;
    if tg_op <> 'DELETE' and new.image_path is not null then new_paths := array[new.image_path]; end if;
  end if;
  foreach path in array old_paths loop
    if not (path = any(new_paths)) and path not like '/images/%' then
      insert into public.image_cleanup(path) values (path) on conflict do nothing;
    end if;
  end loop;
  delete from public.image_cleanup q where q.path = any(new_paths);
  return null;
end; $$;
revoke all on function private.queue_images() from public;
create trigger categories_queue_images after insert or update or delete on public.categories for each row execute function private.queue_images();
create trigger products_queue_images after insert or update or delete on public.products for each row execute function private.queue_images();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp']);
create function private.image_unreferenced(path text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select not exists(select 1 from public.categories where image_path = path)
    and not exists(select 1 from public.products where images @> jsonb_build_array(jsonb_build_object('path', path)));
$$;
revoke all on function private.image_unreferenced(text) from public, anon;
grant execute on function private.image_unreferenced(text) to authenticated;
create policy catalog_images_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
create policy catalog_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin())
    and name ~ '^(products|categories)/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$');
-- Reemplazar significa subir otro archivo y guardar la nueva referencia. Sin upsert.
create policy catalog_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()) and private.image_unreferenced(name));

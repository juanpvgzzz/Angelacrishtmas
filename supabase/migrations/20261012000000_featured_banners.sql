-- Orden de portada independiente del orden del catálogo. Conserva el orden actual.
alter table public.categories drop constraint categories_section_check;
alter table public.categories add constraint categories_section_check
  check (section in ('navidad', 'flores-eternas', 'osos-de-peluche', 'regalos-personalizados', 'munecas-de-trapo'));
alter table public.products add column featured_order integer not null default 0
  constraint products_featured_order_check check (featured_order >= 0);
update public.products set featured_order = sort_order where featured;
create index products_featured_position_idx on public.products(featured_order, id) where featured and active;
create function public.move_featured_product(product_id uuid, direction integer) returns void
language plpgsql security invoker set search_path = '' as $$
declare current_position integer; other_id uuid; other_position integer;
begin
  if not (select private.is_admin()) then raise exception 'Acceso denegado' using errcode = '42501'; end if;
  if direction not in (-1, 1) then raise exception 'Dirección inválida'; end if;
  perform id from public.products where featured order by id for update;
  with numbered as (
    select id, row_number() over (order by featured_order, sort_order, id) - 1 as position
    from public.products where featured
  )
  update public.products p set featured_order = n.position from numbered n where p.id = n.id and p.featured_order <> n.position;
  select featured_order into current_position from public.products where id = product_id and featured;
  if current_position is null then raise exception 'Producto destacado no encontrado'; end if;
  other_position := current_position + direction;
  select id into other_id from public.products where featured and featured_order = other_position;
  if other_id is null then return; end if;
  update public.products set featured_order = case when id = product_id then other_position else current_position end
    where id in (product_id, other_id);
end; $$;
revoke all on function public.move_featured_product(uuid, integer) from public, anon;
grant execute on function public.move_featured_product(uuid, integer) to authenticated;

-- Campañas administrables. Las imágenes reutilizan el bucket público y su política de escritura.
create table public.catalog_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 400),
  eyebrow text not null default '' check (char_length(eyebrow) <= 120),
  button_label text not null default 'Explorar catálogo' check (char_length(btrim(button_label)) between 1 and 80),
  href text not null default '/catalogo/' check (href ~ '^/(catalogo/|producto/|navidad/|flores-eternas/|osos-de-peluche/|regalos-personalizados/|munecas-de-trapo/|categoria/|#|$)' and char_length(href) <= 500),
  image_path text check (image_path is null or image_path ~ '^banners/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$'),
  active boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catalog_banners_active_order_idx on public.catalog_banners(active, sort_order, id);
create trigger catalog_banners_updated_at before update on public.catalog_banners
  for each row execute function private.touch_updated_at();
alter table public.catalog_banners enable row level security;
revoke all on public.catalog_banners from public, anon, authenticated;
grant select on public.catalog_banners to anon, authenticated;
grant insert, update, delete on public.catalog_banners to authenticated;
create policy banners_public_read on public.catalog_banners for select to anon using (active);
create policy banners_admin_read on public.catalog_banners for select to authenticated using (active or (select private.is_admin()));
create policy banners_admin_insert on public.catalog_banners for insert to authenticated with check ((select private.is_admin()));
create policy banners_admin_update on public.catalog_banners for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy banners_admin_delete on public.catalog_banners for delete to authenticated using ((select private.is_admin()));
insert into public.catalog_banners(title, eyebrow, description, button_label, href, active, sort_order) values
 ('Flores para siempre.', 'DETALLES QUE PERDURAN', 'Un gesto que florece, hecho a mano para ti.', 'Explorar flores', '/catalogo/?grupo=flores#creaciones', true, 0),
 ('Tu idea, nuestras manos.', 'TAN ESPECIAL COMO TÚ', 'Colores y pequeños detalles que cuentan tu historia.', 'Ver personalizables', '/catalogo/?grupo=personalizados#creaciones', true, 1),
 ('Una Navidad muy tuya.', 'LA MAGIA DE LOS DETALLES', 'Piezas artesanales para celebrar tus tradiciones.', 'Descubrir Navidad', '/catalogo/?grupo=navidad#creaciones', true, 2);

alter table public.image_cleanup drop constraint image_cleanup_path_check;
alter table public.image_cleanup add constraint image_cleanup_path_check
  check (path ~ '^(products|categories|banners)/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$');
create trigger banners_queue_images after insert or update or delete on public.catalog_banners
  for each row execute function private.queue_images();
create or replace function private.image_unreferenced(path text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select not exists(select 1 from public.categories where image_path = path)
    and not exists(select 1 from public.products where images @> jsonb_build_array(jsonb_build_object('path', path)))
    and not exists(select 1 from public.catalog_banners where image_path = path);
$$;
drop policy catalog_images_admin_insert on storage.objects;
create policy catalog_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin())
    and name ~ '^(products|categories|banners)/[a-f0-9-]+/[a-f0-9-]+\.(jpg|jpeg|png|webp)$');

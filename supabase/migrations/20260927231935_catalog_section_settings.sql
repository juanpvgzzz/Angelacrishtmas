-- A single public configuration; category names/order remain in categories.
create table public.catalog_section_settings (
  id text primary key default 'catalog' check (id = 'catalog'),
  eyebrow text not null default 'HECHO CON AMOR, ELEGIDO POR TI' check (char_length(btrim(eyebrow)) between 1 and 120),
  title text not null default 'Encuentra tu detalle' check (char_length(btrim(title)) between 1 and 120),
  description text not null default 'Artesanía que se siente especial.' check (char_length(btrim(description)) between 1 and 300),
  all_button_label text not null default 'Todo' check (char_length(btrim(all_button_label)) between 1 and 60),
  category_label text not null default 'Categoría' check (char_length(btrim(category_label)) between 1 and 60),
  all_categories_label text not null default 'Todas las categorías' check (char_length(btrim(all_categories_label)) between 1 and 80),
  customizable_label text not null default 'Solo personalizables' check (char_length(btrim(customizable_label)) between 1 and 80),
  show_category_buttons boolean not null default true,
  show_category_select boolean not null default true,
  show_customizable_filter boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.catalog_section_settings enable row level security;
revoke all on public.catalog_section_settings from public, anon, authenticated;
grant select on public.catalog_section_settings to anon, authenticated;
grant insert, update on public.catalog_section_settings to authenticated;
create policy catalog_settings_public_read on public.catalog_section_settings
  for select to anon, authenticated using (true);
create policy catalog_settings_admin_insert on public.catalog_section_settings
  for insert to authenticated with check ((select private.is_admin()));
create policy catalog_settings_admin_update on public.catalog_section_settings
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- No client DELETE privilege or policy: the singleton should not be removed.
create trigger catalog_settings_updated_at before update on public.catalog_section_settings
  for each row execute function private.touch_updated_at();
insert into public.catalog_section_settings(id) values ('catalog');

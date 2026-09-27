-- Version aligned with the migration applied to the connected Supabase project.
alter table public.categories
  add column section text not null default 'navidad'
  constraint categories_section_check check (section in ('navidad', 'munecas-de-trapo'));

comment on column public.categories.section is 'Catalog section inherited by all products in this category.';

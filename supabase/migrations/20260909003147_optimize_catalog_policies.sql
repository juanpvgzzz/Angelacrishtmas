-- Una política de lectura por rol y operación; conserva los mismos permisos.
alter policy categories_public_read on public.categories to anon;
alter policy categories_admin_read on public.categories
  using (active or (select private.is_admin()));
alter policy products_public_read on public.products to anon;
alter policy products_admin_read on public.products
  using ((select private.is_admin()) or
    (active and exists(select 1 from public.categories c where c.id = category_id and c.active)));

-- Tabla privada exclusivamente operativa: denegación explícita para roles del navegador.
create policy imports_no_browser_access on private.catalog_imports for all to anon, authenticated
  using (false) with check (false);

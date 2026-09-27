-- Verificación de permisos reales sin conservar usuarios, datos ni objetos de prueba.
begin;
do $$
declare admin_id uuid := gen_random_uuid(); guest_id uuid := gen_random_uuid();
  category_id uuid := gen_random_uuid(); hidden_category_id uuid := gen_random_uuid();
  product_id uuid := gen_random_uuid(); hidden_product_id uuid := gen_random_uuid();
begin
  perform set_config('catalog_test.admin', admin_id::text, true);
  perform set_config('catalog_test.guest', guest_id::text, true);
  perform set_config('catalog_test.category', category_id::text, true);
  perform set_config('catalog_test.hidden_category', hidden_category_id::text, true);
  perform set_config('catalog_test.product', product_id::text, true);
  perform set_config('catalog_test.hidden_product', hidden_product_id::text, true);
  perform set_config('catalog_test.image', 'products/' || product_id::text || '/' || gen_random_uuid()::text || '.png', true);
  insert into auth.users(id) values(admin_id),(guest_id);
  insert into public.admin_users(user_id) values(admin_id);
  insert into public.categories(id,name,slug,active) values
    (category_id,'Prueba transaccional',category_id::text,true),
    (hidden_category_id,'Oculta transaccional',hidden_category_id::text,false);
  insert into public.products(id,category_id,name,slug,active) values
    (product_id,category_id,'Prueba transaccional',product_id::text,true),
    (hidden_product_id,category_id,'Oculto transaccional',hidden_product_id::text,false);
end $$;

set local role anon;
do $$
begin
  if not exists(select 1 from public.products where id=current_setting('catalog_test.product')::uuid) then raise exception 'Anon no lee activo'; end if;
  if exists(select 1 from public.products where id=current_setting('catalog_test.hidden_product')::uuid) then raise exception 'Anon ve oculto'; end if;
  if exists(select 1 from public.categories where id=current_setting('catalog_test.hidden_category')::uuid) then raise exception 'Anon ve categoría oculta'; end if;
  begin
    insert into public.categories(name,slug) values ('Prohibido',gen_random_uuid()::text);
    raise exception 'Anon pudo insertar';
  exception when insufficient_privilege then null; end;
  begin
    update public.products set name='Prohibido' where id=current_setting('catalog_test.product')::uuid;
    raise exception 'Anon pudo actualizar';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.products where id=current_setting('catalog_test.product')::uuid;
    raise exception 'Anon pudo borrar';
  exception when insufficient_privilege then null; end;
  begin perform * from public.admin_users; raise exception 'Anon ve administradores';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('catalog_test.guest'),true);
do $$
declare affected integer;
begin
  if exists(select 1 from public.admin_users) then raise exception 'No administradora ve miembros'; end if;
  if exists(select 1 from public.products where id=current_setting('catalog_test.hidden_product')::uuid) then raise exception 'No administradora ve ocultos'; end if;
  begin insert into public.admin_users(user_id) values(current_setting('catalog_test.guest')::uuid); raise exception 'Autoalta permitida';
  exception when insufficient_privilege then null; end;
  begin insert into public.categories(name,slug) values('Prohibido',gen_random_uuid()::text); raise exception 'No administradora inserta';
  exception when insufficient_privilege then null; end;
  update public.products set active=false where id=current_setting('catalog_test.product')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'No administradora actualiza'; end if;
  delete from public.products where id=current_setting('catalog_test.product')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'No administradora borra'; end if;
  begin insert into storage.objects(bucket_id,name) values('product-images',current_setting('catalog_test.image')); raise exception 'No administradora sube';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('catalog_test.admin'),true);
do $$
declare affected integer; temporary_category uuid := gen_random_uuid(); previous_updated timestamptz;
begin
  if not exists(select 1 from public.products where id=current_setting('catalog_test.hidden_product')::uuid) then raise exception 'Administradora no ve ocultos'; end if;
  insert into public.categories(id,name,slug) values(temporary_category,'Temporal',temporary_category::text);
  delete from public.categories where id=temporary_category;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Administradora no borra categoría vacía'; end if;
  begin delete from public.categories where id=current_setting('catalog_test.category')::uuid; raise exception 'Se borró categoría con productos';
  exception when foreign_key_violation then null; end;
  begin insert into public.products(category_id,name,slug) values(current_setting('catalog_test.category')::uuid,'Duplicado',current_setting('catalog_test.product')); raise exception 'Slug duplicado permitido';
  exception when unique_violation then null; end;
  begin update public.products set availability='invalid' where id=current_setting('catalog_test.product')::uuid; raise exception 'Disponibilidad inválida permitida';
  exception when check_violation then null; end;
  select updated_at into previous_updated from public.products where id=current_setting('catalog_test.product')::uuid;
  update public.products set availability='sold_out', price=12345 where id=current_setting('catalog_test.product')::uuid;
  if not exists(select 1 from public.products where id=current_setting('catalog_test.product')::uuid and price=12345 and availability='sold_out' and updated_at>previous_updated) then raise exception 'Actualización falló'; end if;
  insert into public.image_cleanup(path) values(current_setting('catalog_test.image'));
  insert into storage.objects(bucket_id,name) values('product-images',current_setting('catalog_test.image'));
  update public.products set images=jsonb_build_array(jsonb_build_object('path',current_setting('catalog_test.image'),'kind','photo','alt','Prueba','width',600,'height',720)) where id=current_setting('catalog_test.product')::uuid;
  if exists(select 1 from public.image_cleanup where path=current_setting('catalog_test.image')) then raise exception 'Imagen guardada sigue pendiente'; end if;
  if private.image_unreferenced(current_setting('catalog_test.image')) then raise exception 'Imagen referenciada eliminable'; end if;
  update public.products set images='[]' where id=current_setting('catalog_test.product')::uuid;
  if not exists(select 1 from public.image_cleanup where path=current_setting('catalog_test.image')) then raise exception 'Imagen retirada sin limpieza'; end if;
  if not private.image_unreferenced(current_setting('catalog_test.image')) then raise exception 'Imagen retirada no se puede limpiar'; end if;
  update public.categories set active=false where id=current_setting('catalog_test.category')::uuid;
end $$;

reset role;
set local role anon;
do $$ begin
  if exists(select 1 from public.products where id=current_setting('catalog_test.product')::uuid) then raise exception 'Producto de categoría oculta visible'; end if;
end $$;
reset role;
rollback;
select 'RLS, CRUD, restricciones y metadatos de Storage: correctos; transacción revertida' as result;

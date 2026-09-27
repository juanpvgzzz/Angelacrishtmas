# Contenido del catálogo de ÁMELA

## Activación

La migración `supabase/migrations/20260927231935_catalog_section_settings.sql` está creada y probada en PostgreSQL local (PGlite). **No se ha aplicado al proyecto remoto.** Aplicar este archivo mediante el flujo habitual de migraciones de Supabase antes de utilizar el nuevo formulario. No ejecutar semillas ni reiniciar la base de datos. La migración únicamente crea la configuración; no modifica categorías ni productos.

Después, abrir `/admin`, entrar con la cuenta administradora y seleccionar **Contenido del catálogo**. Editar Encabezado, Etiquetas y Controles visibles, revisar la vista previa y pulsar **Guardar cambios**. El guardado actualiza el formulario sin recargar. **Cancelar cambios** restaura la última versión cargada/guardada, previa confirmación si corresponde. Se advierte al cerrar la pestaña, navegar fuera o cerrar sesión con cambios pendientes.

Los errores de lectura no habilitan el guardado sobre datos desconocidos. El botón de reintento permite volver a cargar. El guardado compara `updated_at` para evitar sobrescribir una edición realizada desde otra sesión.

## Modelo y seguridad

`catalog_section_settings` contiene un único registro, identificado por `id = 'catalog'`, siete textos, tres booleanos y las fechas `created_at` / `updated_at`. Restricciones SQL y validación del formulario exigen textos no vacíos y límites de 60–300 caracteres. Un trigger actualiza la fecha de modificación.

RLS habilitado, con políticas:

- `catalog_settings_public_read`: SELECT para anon y authenticated.
- `catalog_settings_admin_insert`: INSERT requiere `private.is_admin()`.
- `catalog_settings_admin_update`: UPDATE requiere `private.is_admin()` tanto en USING como en WITH CHECK.

La función existente es SECURITY INVOKER y verifica `admin_users` con `auth.uid()`. No usa metadata editable. GRANT permite SELECT a visitantes; INSERT/UPDATE a authenticated, siempre sujetos a RLS. Nadie desde el cliente tiene permiso DELETE ni una política de borrado. La clave del navegador sigue siendo pública.

Referencias consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API](https://supabase.com/docs/guides/api/securing-your-api) y [cambio de permisos explícitos](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

## Catálogo público

La configuración se lee desde un servicio centralizado. La carga de productos es independiente; si faltan ajustes o falla su lectura, se conservan exactamente los siete textos originales y los controles activos. Los detalles técnicos solo se registran en desarrollo.

Botones y selector utilizan una única categoría seleccionada y la misma lista activa, ordenada por `sort_order`. No existe otra lista de categorías en ajustes. El filtro de personalizables se combina con la categoría. Si ambos controles de categoría están habilitados, se muestran botones desde 768 px y selector por debajo; si solo uno está habilitado, está disponible en ambos tamaños.

Las modificaciones de categorías/configuración aparecen al cargar la página, regresar desde el historial restaurado o volver a su pestaña. No hay Realtime ni sondeo periódico. Las interacciones de filtros no consultan Supabase. Una categoría que deje de estar activa o exista fuera de la sección seleccionada se limpia de la URL y vuelve a Todo dentro de la sección. Los enlaces antiguos de banners se traducen a una categoría disponible, sin reintroducir un segundo filtro por palabras.

## Archivos

Nuevos: `src/config/catalog-settings.ts`, `src/services/supabase/catalog-settings.ts`, `src/components/admin/CatalogContent.astro`, `src/scripts/admin-catalog-content.ts`, la migración y `tests/browser/catalog-content.spec.ts`.

Integración: `src/types/database.ts`, `src/pages/admin/index.astro`, `src/scripts/admin.ts`, `src/components/catalog/Storefront.astro`, `src/scripts/public-catalog.ts`, `src/scripts/catalog-filters.ts`, `src/styles/admin.css` y `src/styles/storefront.css`.

Pruebas ampliadas/adaptadas: `tests/database.test.ts`, `tests/browser/supabase-fixture.ts`, `tests/browser/brand.spec.ts`, `tests/browser/motion.spec.ts` y `tests/browser/sections.spec.ts`.

## Alcance de verificación

Las pruebas de base de datos ejecutan todas las migraciones reales sobre PGlite y comprueban acceso de visitante, cuenta no administradora y administradora, además de restricciones y lectura del cambio guardado. Las pruebas Playwright usan respuestas Supabase interceptadas: verifican formulario, persistencia al recargar, filtros, visibilidad, accesibilidad y tamaños de pantalla; no constituyen una prueba de escritura contra Supabase remoto.

Los asesores remotos consultados antes de los cambios mostraron una advertencia de protección de contraseñas filtradas desactivada y dos avisos informativos de índices sin uso (`products_category_order_idx` e `image_cleanup_created_at_idx`). No se modificaron esos ajustes.

Tras aplicar la migración, comprobar con la cuenta administradora real un guardado y su lectura pública. La nueva interfaz tampoco se ha desplegado; no se realizaron commit, push, clonación ni cambios de productos/categorías reales.

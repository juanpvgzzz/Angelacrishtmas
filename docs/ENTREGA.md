# Entrega local — integración Supabase

Actualizacion del 9 de septiembre de 2026: **Supabase ya esta conectado al proyecto activo `pwadncqwmfapexzjjcju` y ambas migraciones estan aplicadas.** La API publica real fue verificada. Falta crear la primera cuenta administradora y desactivar registros publicos. Consultar [la guia de acceso actual](ACCESO_CATALOGO.md). El resto de este documento conserva el registro historico de la entrega inicial; sus pendientes de creacion y conexion ya no aplican.

## Resultado implementado

- Login correo/contraseña, comprobación de membresía administrativa y cierre de sesión.
- Resumen, CRUD de categorías/productos, visibilidad, orden, destacados, precio COP, disponibilidad y personalización.
- Varias fotografías, principal, orden, reemplazo seguro, validación JPEG/PNG/WebP y 5 MB, vistas previas y avance por fotografías.
- Limpieza de archivos retirados y registro durable para reintentar cargas interrumpidas.
- Catálogo consultado al cargar, filtros, destacados y ficha genérica `/producto/?slug=...`, sin reconstrucciones por edición de contenido.
- Migración con RLS, restricciones, índices, timestamps automáticos, bucket y políticas de Storage.
- Importación manual idempotente de demostración, siempre oculta hasta revisión.
- SDK oficial fijado a `@supabase/supabase-js@2.116.0`; Firebase retirado tras inspeccionar sus archivos.

Hero, Papá Noel, logotipo, estilos globales, configuración de marca, datos originales e ilustraciones permanecen sin modificaciones. La ficha conserva galería, precio, descripción, categoría, disponibilidad, elaboración, personalización, anticipo del 50% y WhatsApp rojo vino.

## Verificaciones realizadas

| Verificación | Resultado |
| --- | --- |
| `npm.cmd run check` | 0 errores, 0 advertencias |
| `npm.cmd test` | 9 pruebas aprobadas |
| `npm.cmd run test:e2e` | 9 pruebas aprobadas |
| `npm.cmd run build` | 17 páginas estáticas generadas |
| `npm.cmd run check:security` | Sin patrones de claves secretas; `.env` ignorado; sin dependencia Firebase |
| Auditoría npm tras instalación | 0 vulnerabilidades reportadas |
| Accesibilidad axe | Sin infracciones detectadas en recorridos probados |
| Consola del navegador | Sin errores en recorridos exitosos probados |
| Capturas | Catálogo móvil/escritorio revisado; panel/formulario en 320, 390 y 1440 px |

No hay configuración de lint independiente en el repositorio. Se ejecutó el comprobador de Astro/TypeScript y `git diff --check`.

La migración `20260908191721_catalog_admin.sql` **se ejecutó en PostgreSQL embebido PGlite de pruebas, no en Supabase remoto**. Allí se comprobaron lectura activa, prohibición de escrituras anónimas, rechazo de administradoras no autorizadas y autoalta, CRUD administrativo, slugs duplicados, relación categoría/productos, precios y disponibilidad inválidos, RLS, timestamps, imágenes referenciadas y seed idempotente.

Las pruebas de navegador interceptan Supabase con fixtures explícitos: prueban UI y flujo de fotografías, no el servidor real de Auth/Storage. No se generaron tipos desde un esquema remoto; `src/types/database.ts` está marcado como provisional. No se ejecutaron asesores remotos.

## Pendientes para completar la conexión real

1. Confirmar organización `juanpvgzzz's Org` para crear el proyecto. La herramienta requiere selección explícita; se verificó que la organización tiene plan Free. Aún falta consultar y confirmar el costo de creación de $0.
2. Crear **Angela Christmas** en `us-east-1`, esperar estado activo y aplicar la migración.
3. Configurar las dos variables públicas de `.env` y generar los tipos desde el esquema real.
4. Desactivar registros públicos/anónimos en Dashboard. Crear allí la primera administradora y añadir su UUID a `admin_users`.
5. Ejecutar asesores de seguridad/rendimiento y pruebas reales de Auth, RLS y Storage. Corregir cualquier problema encontrado antes de dar por terminada la instalación.
6. Revisar e importar la demostración solo si se desea; no se importó a ningún servicio remoto. Configurar el número real de WhatsApp si falta.

Los comandos, variables, SQL exacto de la primera administradora, políticas, límites Free y procedimientos están en [SUPABASE_ADMIN.md](SUPABASE_ADMIN.md). No se necesita enviar contraseñas ni claves secretas.

## Archivos creados

```text
docs/ENTREGA.md
docs/SUPABASE_ADMIN.md
scripts/check-security.mjs
scripts/prepare-demo-import.ts
src/components/catalog/LiveCatalog.astro
src/pages/admin/login.astro
src/pages/producto/index.astro
src/scripts/admin.ts
src/scripts/public-catalog.ts
src/services/supabase/catalog.ts
src/services/supabase/client.ts
src/services/supabase/read-all.ts
src/styles/admin.css
src/types/database.ts
src/utils/catalog-validation.ts
supabase/migrations/20260908191721_catalog_admin.sql
supabase/seeds/demo.sql
tests/browser/supabase-fixture.ts
tests/catalog-validation.test.ts
tests/database.test.ts
```

## Archivos modificados

```text
.env.example
.gitignore
README.md
package.json
package-lock.json
playwright.config.ts
src/components/admin/AccessScreen.astro
src/components/catalog/CategoryTabs.astro
src/components/catalog/ProductCard.astro
src/components/common/Footer.astro
src/env.d.ts
src/pages/admin/index.astro
src/pages/catalogo/index.astro
src/pages/categoria/[slug].astro
src/pages/index.astro
src/pages/producto/[slug].astro
src/services/catalog.ts
src/types/catalog.ts
tests/browser/catalog.spec.ts
```

Los archivos preparatorios `firebase.json`, `src/services/firebase/client.ts` y `src/services/firebase/README.md` fueron inspeccionados y retirados. No se borraron datos de catálogo ni recursos de marca. Los artefactos `dist/`, `test-results/` y la caché del CLI no se versionan.

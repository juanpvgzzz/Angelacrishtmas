# Administración de ÁMELA

Estado actualizado: el proyecto `pwadncqwmfapexzjjcju` ya esta activo y conectado.
Las cuatro migraciones de `supabase/migrations/` ya estan aplicadas, incluido
el precio opcional. La primera cuenta administradora ya existe.
No crear otro proyecto ni repetir la instalacion. Para entrar
y agregar productos, seguir [ACCESO_CATALOGO.md](ACCESO_CATALOGO.md).
Las instrucciones de creacion siguientes corresponden a la instalacion inicial.

## Conexión y plan gratuito

Usar exclusivamente una organización en plan **Free ($0/mes)**. No cambiar de plan, añadir tarjetas, activar réplicas, branches, dominios personalizados de Supabase, PITR, transformaciones de imágenes ni complementos.

La inspección encontró `juanpvgzzz's Org` (`mhdzewrvhntaavyccxkn`), plan `free`, y un proyecto `proto1` inactivo. No reutilizar ni modificar ese proyecto. La creación de **Angela Christmas** está pendiente de selección de organización y confirmación del costo en la herramienta. Preferir `us-east-1`. Esperar estado activo antes de aplicar SQL.

El MCP de Supabase ya respondió correctamente. Si pierde conexión, reconectar la integración de Supabase mediante su flujo OAuth y reabrir la sesión; no compartir tokens ni contraseñas en el chat. Alternativa: crear el proyecto desde Dashboard dentro de una organización Free y verificar que indique $0 antes de continuar.

En Project Settings → API Keys, copiar la **publishable key**, y en la conexión/Data API copiar la URL del proyecto. En `.env`:

```env
PUBLIC_SUPABASE_URL=https://REFERENCIA.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VALOR_PUBLICO
```

Los ejemplos anteriores son marcadores, no credenciales. No colocar una clave `sb_secret_`, `service_role`, contraseña de base de datos ni JWT secret. El cliente rechaza claves secretas y admite la clave antigua solamente si su rol es `anon`.

Las variables existentes `PUBLIC_WHATSAPP_NUMBER` y `PUBLIC_SITE_URL` son opcionales. Para WhatsApp usar el número real internacional, solo dígitos. Configurar estas variables exige reiniciar Astro y, cuando se publique inicialmente, compilar con ellas. **Editar categorías, productos o fotografías no requiere recompilar.**

## Aplicar la migración

Para una instalacion nueva, aplicar los archivos de `supabase/migrations/` en orden de nombre, comenzando por `20260909000651_catalog_admin.sql`. En el proyecto conectado ya estan aplicados: no repetirlos. Si se usa el CLI, consultar su `--help`, enlazar el proyecto y ejecutar las migraciones; no introducir la contraseña de la base de datos en comandos que queden registrados.

La migración crea:

| Recurso | Propósito y permisos |
| --- | --- |
| `public.admin_users` | UUID de administradoras. Cada autenticada puede consultar solo su propia membresía; no puede darse de alta. Solo un operador confiable desde Dashboard registra administradoras. |
| `public.categories` | Categorías, slug único, imagen, visibilidad y orden. Lectura pública activa y CRUD administrativo. |
| `public.products` | Productos, relación obligatoria con categoría, precio numérico COP, disponibilidad restringida, personalización, destacados y fotografías JSON validadas. |
| `public.image_cleanup` | Registro administrativo durable de cargas y archivos retirados que requieren limpieza. No visible al público. |
| `private.catalog_imports` | Registro de importación única, sin acceso desde el navegador. |
| `product-images` | Bucket público, máximo 5 MB, JPEG/PNG/WebP. Solo administradoras pueden subir y retirar objetos sin referencias. |

Todas las tablas anteriores tienen RLS. Los visitantes solo leen categorías activas y productos activos de categorías activas. Una cuenta autenticada sin membresía tiene los mismos permisos de catálogo que un visitante. Las políticas UPDATE contienen `USING` y `WITH CHECK`.

`private.is_admin()` consulta la membresía con `auth.uid()` y RLS; no utiliza `user_metadata`, claims de administrador ni `SECURITY DEFINER`. Las funciones tienen `search_path` explícito y privilegios limitados. Los índices cubren slugs, categoría, actividad, destacados y orden. Triggers mantienen `updated_at` y registran imágenes retiradas.

## Desactivar registros antes de habilitar el panel

En **Authentication → Sign In / Providers**, desactivar **Allow new users to sign up** y los inicios de sesión anónimos. Mantener solo correo/contraseña; no habilitar proveedores sociales ni cuentas de clientes. La ausencia de formulario de registro no sustituye esta configuración del servidor.

En Authentication → URL Configuration, configurar la URL local y posteriormente el dominio público autorizado. No se necesitan enlaces mágicos, proveedores de correo de pago ni Edge Functions.

La configuración remota de Auth requiere Dashboard: las herramientas MCP disponibles no ofrecen modificación de estas opciones. Verificar que un intento directo de registro sea rechazado antes de usar el panel en producción.

## Crear la primera administradora

1. Abrir **Authentication → Users → Add user → Create new user** en el proyecto correcto.
2. Escribir el correo real y una contraseña propia directamente en Dashboard. No guardarla en este repositorio ni compartirla en el chat. Usar creación directa y confirmación del usuario para no depender de envíos de correo.
3. Abrir el usuario y copiar su **User UID / UUID**.
4. En SQL Editor, sustituir `UUID_REAL` y ejecutar:

```sql
insert into public.admin_users (user_id)
values ('UUID_REAL'::uuid)
on conflict (user_id) do nothing;
```

5. Entrar en `/admin/login/`. Una cuenta creada en Auth sin este paso no puede administrar.

Para retirar autorización, eliminar exclusivamente la membresía elegida desde Dashboard. Las políticas vuelven a consultar la tabla en cada operación, de modo que la autorización no depende de un claim antiguo.

## Uso del panel

El panel muestra resumen y listas. Crear primero categorías y después productos. La visibilidad empieza desactivada para evitar publicaciones accidentales. Si una categoría se oculta, sus productos dejan de aparecer públicamente aunque estén activos individualmente.

El slug se genera a partir del nombre y puede editarse. Los slugs duplicados muestran un mensaje claro. El campo Orden define la posición; en empates se ordena por nombre. Los precios se guardan numéricos y la interfaz los formatea en pesos colombianos.

Agregar fotografías en JPEG, PNG o WebP de hasta 5 MB, con un máximo de 12 por producto. La vista previa ocurre localmente; los archivos se suben al guardar. Se muestra el avance por fotografías completadas, no una estimación inventada de bytes transferidos. Usar Subir/Bajar o Hacer principal. Para reemplazar, retirar la fotografía y elegir el archivo nuevo; la anterior permanece hasta guardar correctamente. Cancelar no sube archivos.

Cada carga usa un nombre UUID nuevo bajo `products/{id}/` o `categories/{id}/`, sin `upsert`. Las rutas y el orden se guardan juntos en JSON validado. Tras guardar se retiran archivos anteriores sin uso. Si falla el guardado, se intenta limpiar lo subido. Si se cierra el navegador o falla la red, `image_cleanup` conserva los pendientes y el botón de limpieza reintenta archivos con más de una hora de antigüedad. No hay Cron ni servicio de pago. Storage impide borrar un archivo que siga referenciado.

Se usa control de concurrencia mediante `updated_at`: si otra sesión cambia el registro, el formulario pide volver a abrirlo antes de sobrescribir. El guardado exitoso actualiza las listas. El catálogo público consulta nuevamente al cargar; no se usan suscripciones Realtime.

Una categoría con productos no se puede borrar, incluso si se invoca la API directamente. Cambiar los productos a otra categoría antes. Borrar productos/categorías pide confirmación y no tiene deshacer.

## Importar demostración una vez

No se importan datos al abrir la aplicación. Los archivos originales `src/data/categories.ts`, `src/data/products.ts` y las ilustraciones se conservan intactos.

```powershell
node --experimental-strip-types scripts/prepare-demo-import.ts
```

Este comando solo genera `supabase/seeds/demo.sql`. Tras verificar la conexión y revisar los precios/textos de muestra, ejecutar ese archivo manualmente desde SQL Editor. La transacción mantiene relaciones por slug, evita duplicados y registra `demo-v1` para no repetirse. No sobrescribe registros existentes. Las imágenes mantienen `kind: placeholder` y el contenido importado queda **oculto**. Revisar y activar manualmente desde el panel; no presentarlo como productos reales sin validación.

## Verificación local y remota

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:e2e
```

Si no hay Chrome local, instalar Chromium con Playwright y omitir `CHROME_PATH`. Las pruebas de navegador usan respuestas interceptadas y credenciales ficticias identificadas en `tests/browser/supabase-fixture.ts`, sin llamadas a un proyecto real. Las pruebas de PostgreSQL usan PGlite en memoria; ejecutan la migración real con un esquema mínimo de infraestructura Auth/Storage. No prueban el servidor HTTP real de Storage ni el servicio GoTrue de Auth.

Antes de dar por terminada la conexión remota:

- Aplicar migración al proyecto activo y generar `src/types/database.ts` desde ese esquema con MCP `generate_typescript_types`. Los tipos actuales están identificados como provisionales hasta completar este paso.
- Ejecutar asesores `security` y `performance`; revisar y corregir avisos pertinentes.
- Probar anónimos, autenticada sin membresía y administradora contra RLS real. Confirmar lectura de activos, rechazo de escrituras y ausencia de datos ocultos por slug.
- Comprobar que el servidor rechace registros nuevos y que el login real funcione.
- Subir, reemplazar y eliminar una foto real; comprobar MIME/tamaño y limpieza tras fallo de guardado.
- Probar categorías vacías/con productos, duplicados, estados disponible/bajo pedido/agotado, orden, destacados y ficha pública.
- Inspeccionar consola y móvil/escritorio contra el proyecto real, además de las pruebas locales.

La arquitectura sigue siendo completamente estática y necesita JavaScript para leer el catálogo. El HTML inicial no incluye los datos específicos ni metadatos sociales individuales del producto; esto limita las vistas previas de enlaces y algunos rastreadores. No se añadió un adaptador ni un proveedor de despliegue. Los enlaces nuevos se generan siempre con `/producto/?slug=...`.

## Límites Free a vigilar

Según [los precios oficiales de Supabase](https://supabase.com/pricing), Free incluye 500 MB de base de datos, 1 GB de archivos, 5 GB de transferencia saliente más 5 GB de transferencia cacheada, 50.000 usuarios activos mensuales y hasta dos proyectos activos. Los proyectos pueden pausarse tras una semana de inactividad. Free no incluye backups automáticos. Revisar uso en Dashboard y guardar copias propias de datos/fotografías; reducir peso de imágenes antes de subirlas. No activar una actualización de plan si se alcanza una cuota.

Referencias: [configuración de Auth](https://supabase.com/docs/guides/auth/general-configuration), [subidas estándar](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

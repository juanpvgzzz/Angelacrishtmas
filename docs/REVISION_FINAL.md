# Revisión final de ÁMELA

Comprobaciones realizadas el 9–10 de septiembre de 2026. Cambios locales preparados; no se publicó el sitio. La corrección del precio sí se aplicó al proyecto Supabase conectado.

## Cambios

- Retirada la explicación del origen del nombre en portada e historia. Historia y firma usan ÁMELA; se eliminó la referencia anterior de la documentación de fotos.
- Ajustado el ancho de la historia para evitar una columna vacía.
- Corregido el guardado de productos sin precio: `20260910013741_optional_product_price.sql` permite NULL y elimina el valor predeterminado cero. Conserva los precios existentes y las restricciones numéricas. El historial local coincide con el remoto.
- Corregido un selector ambiguo de la prueba de cotización; se identifica el producto concreto.
- Actualizadas las instrucciones de acceso y migraciones.

## Evidencia funcional

| Comprobación | Resultado |
| --- | --- |
| Astro/TypeScript | 0 errores y 0 advertencias |
| Pruebas de dominio y PostgreSQL | 9 aprobadas, incluyendo precio vacío y permisos RLS |
| Navegador | 14 aprobadas: catálogo, administración, CRUD, imágenes, secciones, accesibilidad y tamaños móviles/escritorio |
| Compilación | 19 páginas generadas |
| Dependencias | `npm audit`: 0 vulnerabilidades conocidas |
| Secretos y conflictos | Comprobador de secretos y `git diff --check` correctos; sin marcadores de conflicto en fuentes |
| API real | Lectura pública correcta; escrituras, cargas de fotos y lectura de administradores anónimas rechazadas |
| Esquema real | RLS en las cuatro tablas públicas, políticas administrativas y bucket JPEG/PNG/WebP de 5 MB comprobados |
| Precio real | Crear sin precio, asignar 25000 y vaciarlo comprobados con rol administrativo autenticado en una transacción revertida |
| Navegador con datos reales | Portada, ficha, inexistentes y redirección administrativa correctas, sin errores de consola |

Las pruebas CRUD de navegador usan respuestas controladas. La transacción real valida SQL y permisos, pero no sustituye un inicio de sesión con contraseña. No se repitió un login humano ni una subida administrativa real a Storage; el proyecto no tenía fotos reales publicadas para comprobar su descarga.

## Seguridad y límites

La revisión del código no confirmó una vía de escalada de visitantes a administradores. La protección depende de Auth y de RLS, no de esconder el enlace. La membresía no se toma de metadatos editables por usuarios. Las fotos son públicas por diseño: ocultar un producto no vuelve privada una URL de imagen ya conocida.

Pendientes externos comprobados:

1. En [Authentication del proyecto](https://supabase.com/dashboard/project/pwadncqwmfapexzjjcju/auth/providers), desactivar **Allow new users to sign up**. El registro estaba habilitado; el acceso anónimo estaba deshabilitado. Una cuenta registrada no obtiene membresía administrativa automáticamente. El CLI requiere autenticación adicional y el MCP disponible no ofrece mutación de esta configuración.
2. El asesor de Supabase advierte que la protección de contraseñas filtradas está desactivada. [La documentación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) la sitúa en Pro o superior. No se cambió el plan. Usar una contraseña larga, única y privada; revisar los controles de contraseña disponibles en el plan actual.
3. Falta el número real de WhatsApp. Hasta configurarlo, los botones llevan a la información de contacto y no abren un chat real.
4. Falta un despliegue público y comprobar sus cabeceras/HTTPS. Confirmar privadamente el login de la propietaria y una subida real antes de publicar.

La revisión reduce riesgos; no certifica ausencia de todos los ataques. Codex Security finalizó el escaneo `4454019a-0196-4592-9c57-a6cd4d5a23b8`, con cobertura parcial por los pendientes externos. Su registro está ligado a la instantánea inicial y advierte cambios del árbol durante la revisión; las correcciones posteriores se verificaron con las pruebas descritas. Daybreak: `not_granted`. Uso reportado por la herramienta: 5.916.495 tokens totales, incluidos 5.496.064 tokens de entrada en caché, en tres hilos.

## Entrar como administradora

1. Iniciar el sitio desde la carpeta del proyecto con `npm.cmd run dev -- --host 127.0.0.1 --port 4321`.
2. Abrir http://127.0.0.1:4321/admin/ o http://127.0.0.1:4321/admin/login/.
3. Introducir el correo y la contraseña de la cuenta del catálogo ya autorizada. No son necesariamente los mismos del Dashboard de Supabase.

También existe el enlace **Administración** al final de la página, junto al copyright. Puedes guardar `/admin/` en favoritos. Sin sesión, redirige al formulario de acceso. Cuando se publique, se usa el dominio real seguido de `/admin/`; las direcciones `127.0.0.1` solo funcionan en este computador.

No hay correo ni contraseña predeterminados. Para recuperar acceso, usar la gestión de usuarios de Supabase con una cuenta autorizada; no compartir contraseñas por chat.

# ÁMELA · Handmade with Love

Rediseño local realizado el 9 de septiembre de 2026. No se hizo commit, push ni despliegue.

## Inspección y conservación

El proyecto usa Astro estático, TypeScript, Manrope y Supabase. Se inspeccionaron componentes, páginas públicas y administrativas, configuración, estilos, servicios, tipos, recursos, migraciones y pruebas. Git ya contenía cambios para separar Navidad y muñecas de trapo; se conservaron, incluida la migración `20260909062336_catalog_sections.sql` previamente aplicada.

No se cambiaron variables de entorno, dependencias, nombres de tablas, Authentication, políticas RLS, reglas de Storage ni migraciones. No se escribieron ni eliminaron registros o fotografías del proyecto remoto. El nombre técnico del paquete permanece igual para evitar cambios innecesarios.

## Componentes y textos

- `Brand`, `Header` y `Footer`: marca tipográfica ÁMELA, descriptor secundario, navegación Inicio / Colecciones / Destacados / Nuestra historia / Contacto; colecciones del pie tomadas de Supabase. Menú móvil con teclado, Escape y devolución de foco. Administración discreta en el pie.
- `Hero`: «Detalles hechos a mano para momentos que merecen durar», descripción de flores, muñecas, decoración y regalos; enlaces a colecciones y consulta general. La explicación del origen del nombre se retiró en la revisión final.
- Nuevos `Collections`, `SeasonalCollection` y `Personalization`: tarjetas de categorías activas y ordenadas; colección de temporada; consulta de personalización con mensaje de ÁMELA.
- `About`: «Manos que convierten ideas en recuerdos». La historia y la firma usan ÁMELA y conservan el dato preexistente de experiencia. El texto abarca artesanía durante todo el año.
- `PurchaseProcess`: seis pasos ligeros, confirmación de disponibilidad, anticipo del 50%, elaboración y acuerdo de entrega. Se conserva la condición de pago original.
- Catálogo y ficha dinámica: categoría en tarjetas, precios COP, «Desde», estados, consulta por producto, galería, personalización, tiempo de elaboración, anticipo y productos relacionados. Las consultas de contenido activo y los filtros existentes siguen vigentes.
- Acceso y panel: «Panel de ÁMELA» y «Gestión del catálogo artesanal». Se conserva la lógica de acceso, formularios, activación, destacados, fotografía, orden y cierre de sesión.
- `BaseLayout`, configuración y recursos: título «ÁMELA | Handmade with Love», descripción general, Open Graph, Twitter, nombre de aplicación, nuevo manifest y favicon vectorial con una A acentuada. Año del pie actualizado también en el navegador.

## Sistema visual y fotografía

Variables semánticas para la paleta solicitada; aliases para conservar compatibilidad con los formularios existentes. Fondos marfil y blanco, botones vino, rosa y salvia como acentos y dorado en detalles mínimos. Georgia como serif del sistema y Manrope local como sans serif; Berkshire Swash ya no se carga. Sin nuevas descargas de fuentes ni imágenes generadas.

La portada actual es tipográfica porque no hay fotografías reales publicadas. Cuando existan, selecciona hasta tres productos activos con foto real de categorías distintas fuera de la sección Navidad, priorizando destacados. Las imágenes llevan dimensiones, carga diferida cuando corresponde y estados explícitos si faltan o fallan. El catálogo conserva las ilustraciones almacenadas y las identifica como muestras.

La sección de temporada toma la categoría del primer producto destacado según el orden existente. Para Navidad muestra «Christmas Collection» y conserva `christmas-scene.svg`; para otra categoría usa su nombre, descripción y fotografía disponible. Si no hay destacados, se oculta. Para cambiarla se usan los destacados y su orden en el panel, sin una tabla adicional.

Se conservaron todos los SVG navideños, el ángel y la ilustración de taller. Papá Noel aparece en sus productos, colecciones y bloque de temporada; dejó de protagonizar el hero o el logotipo. Las rutas `/navidad/`, `/munecas-de-trapo/`, `/catalogo/`, `/categoria/...`, `/producto/` y `/admin/` siguen disponibles.

## Verificaciones

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | 0 errores, 0 advertencias, 0 sugerencias |
| `npm.cmd test` | 9 pruebas aprobadas, incluida migración/RLS en PostgreSQL embebido |
| `npm.cmd run test:e2e` | 14 pruebas aprobadas con respuestas controladas de Supabase |
| `npm.cmd run build` | 19 páginas generadas correctamente |
| Lint | No existe configuración independiente; se ejecutaron Astro/TypeScript y `git diff --check` |
| `npm.cmd run check:security` | Sin patrones de secretos en archivos rastreados o nuevos no ignorados; `.env` ignorado |
| Búsqueda de marca anterior en `src` y `public` | Sin apariciones de Angela Christmas o AngelaChristmas |
| Accesibilidad automatizada | Sin infracciones de las reglas WCAG A/AA evaluadas por axe en portada, catálogo, ficha, acceso y formulario administrativo |
| Responsive | Sin desplazamiento horizontal en 320, 390, 768 y 1440 px; capturas revisadas |
| Consola | Sin errores en recorridos normales de prueba y en lectura real del build |

Las pruebas de navegador cubren login, rechazo de cuentas sin membresía, CRUD, subida/orden/reemplazo de fotos, destacados, categorías, rutas por sección, activos, ocultos, agotados, galería, errores de conexión, catálogo vacío, fotos fallidas, cambios de temporada y navegación móvil con teclado. Las operaciones CRUD se ejecutaron contra fixtures, no contra registros del negocio. En Windows fue necesario cerrar el servidor de pruebas que permanecía abierto al terminar; ambos recorridos finalizaron con código 0.

`node scripts/verify-amela-live.mjs` comprobó el build local mediante consultas públicas reales: cuatro categorías activas, un producto activo, imágenes locales publicadas, ficha real, inexistentes y redirección del visitante desde `/admin/` al login. Authentication respondió correctamente. Se guardaron capturas `test-results/amela-live-320.png`, `amela-live-390.png` y `amela-live-1440.png`.

## Pendientes reales y límites

1. **Fotografías y nuevas colecciones:** el catálogo conectado solo tiene categorías navideñas y un Papá Noel, con ilustraciones de demostración. Faltan fotos autorizadas de flores, muñecas y otras piezas. No se inventaron productos ni se sustituyeron fotos reales.
2. **WhatsApp:** `PUBLIC_WHATSAPP_NUMBER` no tiene un número real configurado. Los botones conservan la protección existente y llevan a la información de contacto; no abren un chat con un número inventado. Quedaron preparados los mensajes generales, personalizados y con nombre del producto. Se verificaron la codificación de enlaces y el bloqueo del número de ejemplo.
3. **Cuenta administrativa real:** el flujo de login y administración pasó con fixtures. No se dispuso de credenciales reales ni cuentas temporales vigentes para probar un inicio de sesión remoto; queda esa comprobación manual con la propietaria.
4. **Storage real:** no hay fotografías reales publicadas que permitan probar descargas de objetos existentes. La integración de subida, orden y reemplazo se comprobó con fixtures y las políticas con PostgreSQL embebido. No se afirma una subida real en esta entrega.
5. **Secciones técnicas:** se conserva el esquema anterior con las secciones Navidad y muñecas de trapo. Las tarjetas públicas provienen de categorías activas, no de una lista fija. Añadir otras secciones técnicas independientes exigiría ampliar ese esquema en un trabajo posterior; no se cambió la migración aplicada.
6. **SEO de fichas dinámicas:** se actualizan título y descripción al cargar el producto. Se conserva la arquitectura estática existente: los rastreadores que no ejecutan JavaScript reciben metadatos generales, no una ficha renderizada en servidor.

No hay decisiones de implementación esperando aprobación. Para completar los pendientes de contenido hacen falta las fotos reales, el número de contacto y la comprobación privada de acceso; no deben enviarse contraseñas al repositorio ni al chat.

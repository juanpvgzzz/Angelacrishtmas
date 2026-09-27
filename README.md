# ÁMELA · Handmade with Love

Estado final y comprobaciones: [revisión y pendientes externos](docs/REVISION_FINAL.md).

Rediseño de identidad: [alcance, verificaciones y pendientes](docs/REDISENO_AMELA.md).

Guia de acceso actualizada: [entrar y agregar productos](docs/ACCESO_CATALOGO.md).
Supabase ya esta conectado y la primera cuenta administradora esta habilitada.

Catálogo público y administración con Astro estático, TypeScript y Supabase. Identidad artesanal ÁMELA, colecciones dinámicas y Navidad como colección de temporada. Se conservan la administración, las rutas existentes y el anticipo del 50%.

## Ejecutar

Requiere Node.js 22.12 o superior y npm.

```powershell
npm.cmd ci
Copy-Item .env.example .env
# Completar únicamente los valores públicos indicados en .env.example.
npm.cmd run dev
```

Abrir http://localhost:4321. Acceso administrativo: /admin/login/. Panel: /admin/.

No sobrescribas un .env existente. Sin configuración, la interfaz muestra un error de conexión y no publica los productos de muestra.

## Configuración de Supabase Free

Consultar [la guía completa](docs/SUPABASE_ADMIN.md) para crear el proyecto gratuito, aplicar la migración, desactivar registros, crear la primera administradora y probar Storage/RLS.

Variables públicas:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Se mantienen PUBLIC_SITE_URL y PUBLIC_WHATSAPP_NUMBER para la configuración de marca y WhatsApp. El número predeterminado de ÁMELA es +57 3046583246 (`573046583246`). Cotizar abre WhatsApp con el nombre del producto y el enlace absoluto a su imagen principal; el cliente confirma el envío en WhatsApp. El enlace permite abrir la foto, pero no adjunta el archivo ni garantiza una vista previa: eso depende de WhatsApp. Las imágenes locales requieren publicar la web para que el destinatario pueda abrirlas. El número de ejemplo sigue bloqueado.

.env está ignorado por Git. Nunca colocar contraseñas, claves secretas, service_role ni JWT secrets en el navegador o el repositorio.

## Acceso cuando se publique en Vercel

El acceso será `https://TU-DOMINIO/admin/login/` con el correo y la contraseña de la cuenta administradora existente. Después de iniciar sesión se abre `/admin/`. Vercel aloja la web; Supabase conserva usuarios, productos y fotografías.

Antes del despliegue, configurar en Vercel `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` del mismo proyecto actual, `PUBLIC_WHATSAPP_NUMBER=573046583246` y `PUBLIC_SITE_URL` con el dominio final. Compilar con `npm run build`, salida `dist` y framework Astro. No hace falta un adaptador para esta salida estática. Las ediciones del catálogo desde el panel no requieren otro despliegue.

Referencia: [Astro en Vercel](https://vercel.com/docs/frameworks/frontend/astro). Esta documentación no implica que se haya desplegado el sitio.

## Funcionamiento

- Dos secciones, Navidad (`/navidad/`) y Munecas de trapo (`/munecas-de-trapo/`), con categorias propias y el mismo panel. Los productos heredan la seccion de su categoria; el catalogo general permite recorrer ambas.
- La migracion `20260909062336_catalog_sections.sql` agrega `categories.section` y mantiene los datos anteriores en Navidad. Ya fue aplicada en el proyecto conectado.

- El navegador consulta categorías y productos activos en cada carga. Las modificaciones del catálogo no requieren build ni despliegue.
- Las fichas nuevas usan /producto/?slug=nombre-del-producto. Los enlaces antiguos de demostración conservan carcasas compatibles sin datos incrustados.
- El panel verifica una sesión válida y la membresía en admin_users. RLS aplica los permisos independientemente de la interfaz.
- Las fotografías usan rutas únicas. La primera es la principal; orden y metadatos se guardan atómicamente en products.images.
- Los registros nuevos e importados comienzan ocultos. La administradora revisa y publica manualmente.
- El respaldo en src/data/ se conserva para desarrollo e importación explícita. No se utiliza como respuesta automática ante fallos de Supabase.

## Verificaciones

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:e2e
```

Las pruebas de navegador usan el puerto 4322 y respuestas interceptadas de prueba; no crean cuentas ni modifican un proyecto remoto. Las pruebas SQL ejecutan la migración real en PostgreSQL embebido PGlite, con infraestructura mínima que simula los esquemas Auth/Storage. Esto no sustituye los asesores ni la verificación de servicios en Supabase real.

No existe configuración de lint separada; astro check verifica Astro y TypeScript. No se han ejecutado commit, push ni despliegue.

## Archivos principales

- src/services/supabase/: cliente único, consultas, adaptación de tipos y autorización.
- src/scripts/admin.ts: formularios, CRUD, fotografías y estados.
- src/scripts/public-catalog.ts: catálogo y fichas dinámicas con las clases visuales existentes.
- src/pages/admin/: acceso y panel.
- src/pages/producto/index.astro: ficha genérica.
- supabase/migrations/: esquema, restricciones, índices, RLS y Storage.
- scripts/prepare-demo-import.ts y supabase/seeds/demo.sql: importación manual idempotente.
- tests/: pruebas de dominio, SQL y navegador.

# Acceso al catalogo

Estado comprobado el 9 de septiembre de 2026.

## Entrar

Haz doble clic en `Iniciar-AMELA.cmd`, en la carpeta del proyecto. Enciende el servidor en segundo plano y abre el acceso en tu navegador. Si ya estaba encendido, reutiliza el servidor. Despues de reiniciar el computador, vuelve a ejecutar ese archivo.

Si aparece "Failed to load page" o "No se puede acceder a este sitio" en `127.0.0.1:4321`, ejecuta ese archivo: una direccion local necesita que el servidor este encendido.

- Sitio local: http://127.0.0.1:4321/
- Acceso: http://127.0.0.1:4321/admin/login/
- Panel: http://127.0.0.1:4321/admin/
- Tambien hay un enlace "Administración" al final de la pagina, junto al copyright.
- Puedes guardar `/admin/` en los favoritos del navegador. Si no hay sesion, redirige al login.

Para iniciar el sitio desde esta carpeta: `npm.cmd run dev -- --host 127.0.0.1 --port 4321`.
Estas direcciones funcionan en este computador. No son un despliegue publico.

## Activar la primera cuenta

El proyecto **Angela Christmas** (`pwadncqwmfapexzjjcju`) esta activo,
conectado y tiene las migraciones de catalogo, permisos, secciones y precio opcional aplicadas. La primera cuenta ya esta
confirmada y autorizada. El inicio de sesion y la creacion de productos con
fotografia fueron comprobados contra Supabase real. No existe correo ni
contrasena predeterminados. Los pasos siguientes son para cuentas adicionales.

1. Abrir https://supabase.com/dashboard/project/pwadncqwmfapexzjjcju/auth/users
2. Elegir **Add user > Create new user**, indicar tu correo y establecer una
   contrasena privada. Marcar **Auto Confirm User**.
3. Copiar el UID de esa cuenta. En SQL Editor del mismo proyecto ejecutar:

```sql
insert into public.admin_users (user_id)
values ('REEMPLAZAR_POR_EL_UID_DE_TU_CUENTA'::uuid)
on conflict (user_id) do nothing;
```

4. En **Authentication > Sign In / Providers**, desactivar **Allow new users
   to sign up**. Los accesos anonimos ya estan desactivados.
5. Entrar al acceso local con ese correo y contrasena.

No compartir la contrasena por chat. La cuenta de Supabase Dashboard y la
cuenta del catalogo son accesos distintos. Crear una cuenta sin asignarle
la membresia en `admin_users` no permite modificar productos.

## Agregar y publicar productos

El catalogo tiene dos secciones: **Navidad** (`/navidad/`) y **Munecas de trapo**
(`/munecas-de-trapo/`). Ambas comparten el mismo acceso y todas las funciones
de productos, fotografias, precios, disponibilidad, personalizacion y WhatsApp.

En el panel, **Seccion del catalogo** filtra las listas y el resumen. Al crear
una categoria selecciona su **Seccion**. Al crear un producto, selecciona la
seccion y una de sus categorias. Para mover un producto, cambia su seccion y
elige una categoria de destino. Cambiar la seccion de una categoria mueve
todos sus productos. Las categorias anteriores pertenecen a Navidad.

La seccion de munecas comienza sin productos: agrega tus piezas y fotografias
reales desde el panel. El catalogo general (`/catalogo/`) muestra ambas secciones.

1. Crear una categoria o editar una existente y activar **Visible en el catalogo**.
2. Pulsar **Crear producto**. Completar nombre, categoria, descripcion corta y
   precio opcional en pesos colombianos. Dejarlo vacio muestra "Precio a cotizar". El slug se genera a partir del nombre.
3. Agregar fotografias JPEG, PNG o WebP, de hasta 5 MB cada una (maximo 12).
   La primera fotografia es la principal.
4. Seleccionar disponibilidad, tiempo de elaboracion y personalizacion.
5. Marcar **Visible en el catalogo** y pulsar **Guardar cambios**.
6. Abrir o recargar el catalogo para comprobarlo. No requiere recompilar.

Revisar los textos, precios e imagenes antes de publicar. Un producto visible dentro de una
categoria oculta tampoco aparece al publico.

## Verificacion y pendientes

La API real responde y rechaza escrituras y cargas de fotos anonimas.
La cuenta humana ya fue verificada en navegador contra Auth real: acceso,
creacion de categoria y producto, subida de foto, ficha publica, ocultacion
y eliminacion. El contenido temporal de prueba fue retirado. El cierre de
registros aun requiere la configuracion indicada arriba.

Para recibir consultas falta configurar el numero real en
`PUBLIC_WHATSAPP_NUMBER` y reiniciar el sitio. Para compartir el catalogo
fuera de este computador falta un despliegue publico.

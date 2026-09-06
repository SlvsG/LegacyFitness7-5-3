# Legacy Fitness v2 — Cuentas de cliente, coaches, calendario y correos

Esta es la nueva versión, aparte de la que ya tienes publicada. Trae:

- Presentación inicial con paquetes/precios (como al principio) y el nuevo
  fondo con textura de concreto/grafiti.
- Menú desplegable (☰) en móvil.
- **Cuenta de cliente**: el visitante entra con su correo, le llega un
  código de 6 dígitos, lo escribe y ya quedó registrado. Puede ver su
  perfil (correo, cumpleaños, si ya pagó o no), y solo puede **ver**
  Horarios, Galería y Tienda — no puede editar nada.
- **Panel de administrador ampliado**: todo lo que ya tenías (WODs,
  horarios, tienda, galería), más:
  - **Coaches**: agregar/editar/quitar, con foto, "sobre mí" y cumpleaños.
  - **Calendario de WODs personalizados**: por fecha exacta, hora y clase
    (lunes a viernes), con botón para **descargar en PDF** con el logo de
    Legacy (usa la función de imprimir del navegador → "Guardar como PDF").
  - **Clientes**: lista de quienes se registraron, con un botón para
    marcar "Pagó" / "Pendiente" — al cambiarlo, se le manda un correo
    automático avisándole.

## Antes de nada: mueve los archivos nuevos a tu carpeta `convex/`

Igual que la vez pasada, copia estos archivos dentro de la carpeta
`convex/` de tu proyecto (`legacyfitness753/convex/`), **reemplazando**
`schema.ts` (cambió) y agregando los nuevos:

- `schema.ts` (reemplaza el que ya tienes)
- `clients.ts` (nuevo)
- `coaches.ts` (nuevo)
- `scheduleWods.ts` (nuevo)
- `email.ts` (nuevo)

## Parte 1 — Crea tu cuenta gratis de SendGrid (para enviar correos)

Usamos **SendGrid** en vez de otros proveedores porque te deja verificar
**una sola dirección de correo tuya** (puede ser tu propio Gmail) sin
necesitar comprar ni configurar un dominio — y aun así enviar a
cualquier cliente real (Gmail, Outlook, Hotmail, el que sea). Es gratis
hasta 100 correos al día, más que suficiente para un gimnasio.

1. Ve a **signup.sendgrid.com** y crea una cuenta gratis.
2. Confirma tu correo cuando te llegue el link de verificación.
3. Dentro del dashboard, ve a **Settings → Sender Authentication**.
4. Busca la opción **Single Sender Verification** y dale **Verify a
   Single Sender** (o "Create New Sender").
5. Llena el formulario: en **"From Email Address"** pon el correo que
   quieres que vean tus clientes como remitente — puede ser tu Gmail
   personal o el que uses para el gimnasio. Llena también nombre,
   dirección, etc. (piden estos datos por norma anti-spam, no se
   comparten).
6. Dale **Create**. Te va a llegar un correo a esa dirección con un
   botón **"Verify Single Sender"** — ábrelo y haz clic. Cuando el
   estado diga **Verified** (✅), ya puedes enviar a cualquier persona.
7. Ahora ve a **Settings → API Keys → Create API Key**. Ponle un nombre
   (ej. "legacy-fitness"), elige **Restricted Access** y dale permiso de
   **Mail Send** únicamente. Copia la clave que empieza con `SG....` —
   solo se muestra una vez, guárdala.

## Parte 2 — Configura las variables en Convex

En la Terminal, dentro de tu carpeta del proyecto:

```
npx convex env set SENDGRID_API_KEY "SG.tu_clave_aqui"
npx convex env set SENDGRID_FROM "tucorreo@verificado.com"
```

(`SENDGRID_FROM` debe ser EXACTAMENTE el correo que verificaste en el
paso anterior — si no coincide, SendGrid rechaza el envío.)

Esto las deja en tu deployment de **desarrollo**. Para que funcione en
el sitio publicado, agrégalas también en **Production** desde el
dashboard (igual que hiciste con `ADMIN_PASSWORD`):

1. dashboard.convex.dev → tu proyecto → cambia el selector a **Production**.
2. **Settings → Environment Variables → Add variable**.
3. Agrega `SENDGRID_API_KEY` (tu clave `SG....`) y `SENDGRID_FROM` (tu
   correo verificado). Guarda.

## Parte 3 — Sincroniza y despliega

1. Si tienes `npx convex dev` corriendo, en cuanto pegues los archivos
   nuevos en `convex/` los va a detectar y sincronizar solo.
2. Cuando esté listo, despliega a producción:

```
npx convex deploy
```

Confirma con `Y` si te lo pregunta.

## Parte 4 — Prueba el sitio v2

1. Abre `legacy-fitness-v2.html` (puedes probarlo igual que la vez
   pasada, con `python3 -m http.server 8000` y
   `http://localhost:8000/legacy-fitness-v2.html`).
2. Dale clic al ícono de persona (junto al candado) para probar el login
   de cliente: escribe un correo tuyo real, revisa tu bandeja de entrada
   (y spam) por el código, escríbelo, y confirma que te deja ver tu perfil.
3. Entra como administrador (candado) y prueba: agregar un coach, crear
   un WOD por fecha y descargarlo en PDF, y marcar a un cliente como
   "Pagó" — revisa que llegue el correo.

## Notas importantes

- El login de cliente **no queda guardado si cierras el navegador o
  recargas la página** — cada visita hay que volver a pedir el código.
  Es una limitación intencional de este tipo de sitio (sin servidor
  propio detrás); si más adelante quieres que la sesión se mantenga días
  sin volver a loguearse, se puede resolver con un poco más de trabajo.
- El plan gratuito de SendGrid tiene un límite de 100 correos al día —
  más que suficiente para un gimnasio, pero si algún día crece mucho,
  se puede subir de plan ahí mismo.
- Una vez que confirmes que todo funciona bien en esta v2, dime y la
  subimos a Cloudflare/Netlify igual que la otra, o si prefieres,
  reemplazamos el sitio actual con esta versión.

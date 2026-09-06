# Login real con Google y Microsoft (Outlook/Hotmail)

Con esto, el botón "Continuar con Google" y "Continuar con Microsoft" del
sitio funcionan de verdad: el cliente da clic, elige su cuenta, y regresa
ya con su sesión iniciada — sin escribir correo ni código. El login por
código (el que ya tenías) se queda como alternativa, por si alguien no
quiere usar Google/Microsoft.

Esto usa unas rutas nuevas del servidor (`convex/http.ts` y
`convex/oauth.ts`) que ya vienen incluidas. Solo te falta crear las
"llaves" (credenciales) en Google y Microsoft, y pegarlas en Convex.

## Antes que nada: copia los archivos nuevos

A tu carpeta `convex/` (la de siempre, `legacyfitness753/convex/`),
copia/reemplaza:

- `schema.ts` (cambió — agrega la tabla `oauthStates`)
- `clients.ts` (cambió — ahora guarda nombre y fecha de pago)
- `oauth.ts` (nuevo)
- `http.ts` (nuevo — aquí viven las rutas de login social)

## Parte 1 — Averigua tus dos URLs de Convex

Necesitas la URL de **Development** y la de **Production**, en su
versión `.convex.site` (no `.convex.cloud`):

- Development: `https://successful-koala-959.convex.site`
- Production: `https://sincere-warthog-934.convex.site`

(Si tus nombres son distintos, ve a dashboard.convex.dev → tu proyecto →
Settings → ahí dice "HTTP Actions URL" para cada uno.)

Vas a necesitar estas URLs completas con `/oauth/google/callback` y
`/oauth/microsoft/callback` al final, para pegarlas en Google y
Microsoft en los pasos siguientes.

## Parte 2 — Crea las credenciales en Google

1. Ve a **console.cloud.google.com** e inicia sesión.
2. Si no tienes un proyecto, créalo (arriba a la izquierda, "New
   Project"). Nómbralo "Legacy Fitness" o como quieras.
3. Ve a **APIs & Services → OAuth consent screen**.
   - Tipo de usuario: **External**.
   - Llena el nombre de la app ("Legacy Fitness"), tu correo de soporte,
     y guarda. No hace falta publicarla para producción si solo la vas
     a usar tú y tus clientes (puedes dejarla en modo "Testing" y
     agregar los correos que la van a probar, o publicarla para que
     cualquiera pueda entrar — "Publish App", sin necesidad de
     verificación de Google para este uso básico).
4. Ve a **APIs & Services → Credentials → Create Credentials → OAuth
   client ID**.
   - Tipo de aplicación: **Web application**.
   - Nombre: "Legacy Fitness".
   - En **Authorized redirect URIs**, agrega AMBAS (una por línea):
     ```
     https://successful-koala-959.convex.site/oauth/google/callback
     https://sincere-warthog-934.convex.site/oauth/google/callback
     ```
   - Dale **Create**. Te va a mostrar un **Client ID** y un **Client
     Secret** — cópialos, los necesitas en el siguiente paso.

## Parte 3 — Crea las credenciales en Microsoft

1. Ve a **entra.microsoft.com** (o portal.azure.com → "Microsoft Entra
   ID") e inicia sesión con una cuenta Microsoft (personal o de trabajo,
   cualquiera sirve para esto).
2. Ve a **App registrations → New registration**.
   - Nombre: "Legacy Fitness".
   - Tipo de cuenta compatible: elige **"Accounts in any organizational
     directory and personal Microsoft accounts"** (para que funcione
     tanto con Outlook/Hotmail personal como con cuentas de empresa).
   - En **Redirect URI**, elige tipo **Web** y pon:
     ```
     https://sincere-warthog-934.convex.site/oauth/microsoft/callback
     ```
   - Dale **Register**.
3. Ya registrada, ve a **Authentication** (menú izquierdo) y agrega
   también la URL de development:
     ```
     https://successful-koala-959.convex.site/oauth/microsoft/callback
     ```
4. Copia el **Application (client) ID** que aparece en la página
   principal ("Overview") de tu app.
5. Ve a **Certificates & secrets → New client secret**. Dale una
   descripción y "Add". Copia el **Value** que te muestra (¡solo se ve
   una vez, cópialo de inmediato!) — ese es tu Client Secret.

## Parte 4 — Configura las 4 variables en Convex

En la Terminal, dentro de tu proyecto:

```
npx convex env set GOOGLE_CLIENT_ID "tu_client_id_de_google"
npx convex env set GOOGLE_CLIENT_SECRET "tu_client_secret_de_google"
npx convex env set MICROSOFT_CLIENT_ID "tu_client_id_de_microsoft"
npx convex env set MICROSOFT_CLIENT_SECRET "tu_client_secret_de_microsoft"
```

Y repítelo en **Production** desde el dashboard (Settings →
Environment Variables → Add variable), igual que hiciste con
`ADMIN_PASSWORD` y `SENDGRID_API_KEY` — las 4 variables, una por una.

### Sobre `SITE_URL` (opcional pero recomendado)

Después de que Google/Microsoft confirman quién es el cliente, el sitio
lo regresa a tu página principal. Por defecto regresa al mismo dominio
de Convex, así que es mejor decirle exactamente a dónde volver — tu
sitio real:

```
npx convex env set SITE_URL "https://legacyfitness753.netlify.app"
```

(Agrégala también en Production con la URL final que uses ahí.)

## Parte 5 — Despliega

```
npx convex deploy
```

Confirma con `Y` si te lo pide.

## Parte 6 — Prueba

1. Abre el sitio, dale clic al ícono de persona (Mi cuenta).
2. Dale clic a **"Continuar con Google"** — te debe mandar a la pantalla
   normal de Google para elegir tu cuenta. Acepta.
3. Deberías regresar al sitio ya con tu perfil abierto (nombre y correo
   tomados automáticamente de tu cuenta de Google).
4. Repite la prueba con **"Continuar con Microsoft"**, usando una cuenta
   de Outlook/Hotmail.

## Notas importantes

- El nombre completo se toma automáticamente de la cuenta de Google o
  Microsoft — el cliente no tiene que escribirlo. El cumpleaños sigue
  siendo algo que el cliente llena manualmente desde "Editar perfil"
  (Google/Microsoft no siempre comparten esa información).
- Si ves el error "no se pudo iniciar sesión (invalid_state)" al
  regresar, casi siempre es porque tardaste mucho en aceptar en la
  pantalla de Google/Microsoft (el enlace vence en 10 minutos) — intenta
  de nuevo.
- Si Google/Microsoft te muestran un error de "redirect_uri_mismatch",
  significa que la URL que copiaste en el paso 2 o 3 no es EXACTAMENTE
  igual a la que usa tu deployment (revisa que no falte una `/` o que
  no hayas mezclado development con production).

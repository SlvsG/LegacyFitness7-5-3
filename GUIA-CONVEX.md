# Base de datos Legacy Fitness con Convex

Con esto, las fotos (productos y galería), los WODs, los horarios y el
catálogo se guardan en una base de datos real (Convex), y se actualizan
**en tiempo real** en todos los dispositivos: celular, computadora, tablet,
lo que sea. Solo el administrador (con contraseña) puede agregar, editar o
quitar cosas; todos los demás solo ven.

Necesitas tener instalado **Node.js** en tu computadora (una sola vez, para
hacer el despliegue). Después de desplegado, el sitio funciona solo con
internet, sin que tengas la computadora prendida.

## Parte 1 — Crear el proyecto en Convex

1. Abre una terminal dentro de la carpeta `convex-backend` que te entregué.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia sesión / crea tu cuenta de Convex y arranca el proyecto:
   ```bash
   npx convex dev
   ```
   La primera vez te va a pedir iniciar sesión con GitHub o Google, y luego
   crear un proyecto (puedes llamarlo `legacy-fitness`). Esto:
   - Crea las tablas definidas en `convex/schema.ts`
     (`products`, `gallery`, `wods`, `horarios`, `sessions`).
   - Sube las funciones (`convex/*.ts`).
   - Deja una ventana corriendo, sincronizando cambios. Puedes dejarla
     abierta mientras pruebas, y cerrarla cuando termines (no afecta el
     sitio ya desplegado).

## Parte 2 — Configurar la contraseña de administrador

1. En el mismo proyecto, corre:
   ```bash
   npx convex env set ADMIN_PASSWORD "la-contraseña-que-tú-quieras"
   ```
   Esa es la contraseña que vas a usar en el sitio para entrar como
   administrador. No queda escrita en ningún archivo del sitio — vive
   solo dentro de Convex, así que es segura.

## Parte 3 — Desplegar a producción

1. Corre:
   ```bash
   npx convex deploy
   ```
2. Copia la **URL de tu deployment de producción**. Se ve algo así:
   `https://feliz-tapir-123.convex.cloud`
   (la puedes encontrar también en dashboard.convex.dev → tu proyecto →
   Settings → URL & Deploy Key, usa la de "Production").

## Parte 4 — Conectar el sitio web con Convex

1. Abre el archivo `legacy-fitness.html`.
2. Busca esta línea cerca del inicio del `<script type="module">`:
   ```js
   const CONVEX_URL = "";
   ```
3. Pega ahí tu URL de producción:
   ```js
   const CONVEX_URL = "https://feliz-tapir-123.convex.cloud";
   ```
4. Guarda el archivo. Ya puedes subir `legacy-fitness.html` (renómbralo a
   `index.html`) a Cloudflare Pages, o al hosting que prefieras — es un
   archivo estático normal, Convex vive aparte en la nube.

## Listo — así se comporta el sitio

- La primera vez que alguien abre el sitio, se cargan automáticamente los
  horarios conocidos de Legacy Fitness (mañana y tarde).
- Cuando el administrador entra con el candado y la contraseña, puede:
  - Editar el WOD del día por sección (Caja / Programación).
  - Agregar, editar o borrar productos del catálogo — con foto real,
    elegida desde la galería del celular o computadora, guardada en Convex.
  - Agregar o borrar fotos de la galería de comunidad, igual con fotos
    reales tomadas del dispositivo.
  - Agregar o quitar horarios.
- **Cualquier cambio se ve al instante en todos los dispositivos** que
  tengan el sitio abierto — no hace falta ni recargar la página, porque
  Convex empuja la actualización en tiempo real (como WhatsApp Web).
- Los visitantes normales (sin contraseña) solo pueden ver, nunca editar.

### Sobre la seguridad

- Todas las funciones que escriben en la base de datos (`add`, `update`,
  `remove`, `upsert`) revisan primero que exista una sesión de
  administrador válida (`requireAdmin`). Sin la contraseña correcta,
  ningún visitante puede modificar nada, aunque mire el código del sitio.
- Las sesiones de administrador duran 12 horas y luego hay que volver a
  iniciar sesión.

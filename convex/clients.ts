import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Pide un código de acceso: lo genera, lo guarda y programa el envío del
// correo (el envío real ocurre en email.ts, en segundo plano).
export const requestLoginCode = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes("@")) throw new Error("Correo inválido.");
    const code = randomCode();
    const expiresAt = Date.now() + CODE_TTL_MS;
    await ctx.db.insert("loginCodes", { email: cleanEmail, code, expiresAt, used: false });
    const html = `<div style="font-family:sans-serif;padding:24px">
      <h2 style="margin-bottom:4px">Tu código de acceso</h2>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#111">${code}</p>
      <p>Vence en 10 minutos. Si tú no lo pediste, ignora este correo.</p>
      <p style="color:#888">— Legacy Fitness</p>
    </div>`;
    await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
      to: cleanEmail,
      subject: "Tu código de acceso a Legacy Fitness",
      html,
    });
  },
});

// Verifica el código y crea (o reconoce) al cliente + su sesión.
export const verifyCode = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, { email, code }) => {
    const cleanEmail = email.trim().toLowerCase();
    const candidates = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .collect();
    const match = candidates.find(
      (c) => c.code === code.trim() && !c.used && c.expiresAt > Date.now()
    );
    if (!match) throw new Error("Código incorrecto o vencido.");
    await ctx.db.patch(match._id, { used: true });

    let client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .unique();
    let isNewClient = false;
    if (!client) {
      const id = await ctx.db.insert("clients", { email: cleanEmail, paid: false, createdAt: Date.now() });
      client = await ctx.db.get(id);
      isNewClient = true;
    }

    const token = randomToken();
    const now = Date.now();
    await ctx.db.insert("clientSessions", {
      token,
      email: cleanEmail,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      token,
      isNewClient,
      email: cleanEmail,
      name: client?.name ?? null,
      birthday: client?.birthday ?? null,
      paid: client?.paid ?? false,
    };
  },
});

// Utilidad para el resto de funciones de cliente: exige una sesión válida.
export async function requireClient(ctx: any, token: string | undefined): Promise<string> {
  if (!token) throw new Error("No autorizado: inicia sesión.");
  const session = await ctx.db
    .query("clientSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Sesión inválida o expirada. Vuelve a iniciar sesión.");
  }
  return session.email;
}

// Guarda/actualiza el nombre y/o cumpleaños del cliente (se puede llamar
// con solo uno de los dos, o ambos a la vez).
export const setProfile = mutation({
  args: {
    token: v.string(),
    name: v.optional(v.string()),
    birthday: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, name, birthday, photoStorageId }) => {
    const email = await requireClient(ctx, token);
    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!client) return;
    // Si sube una foto nueva y ya tenía una, borra la vieja para no dejar
    // archivos huérfanos en el storage.
    if (photoStorageId && client.photoStorageId && client.photoStorageId !== photoStorageId) {
      await ctx.storage.delete(client.photoStorageId);
    }
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (birthday !== undefined) patch.birthday = birthday;
    if (photoStorageId !== undefined) patch.photoStorageId = photoStorageId;
    if (Object.keys(patch).length > 0) await ctx.db.patch(client._id, patch);
  },
});

export const getMe = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("clientSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", session.email))
      .unique();
    if (!client) return null;
    return {
      email: client.email,
      name: client.name ?? null,
      birthday: client.birthday ?? null,
      paid: client.paid,
      lastPaymentDate: client.lastPaymentDate ?? null,
      photoUrl: client.photoStorageId ? await ctx.storage.getUrl(client.photoStorageId) : null,
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("clientSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// ---------------- Administración de clientes ----------------

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.query("clients").order("desc").collect();
  },
});

// Lista de clientes visible para CUALQUIERA que tenga sesión iniciada (ya
// sea como cliente o como administrador) — nombre, cumpleaños, correo y
// estado de pago. No requiere ser administrador, solo estar logueado.
// Lista de clientes registrados, visible para cualquiera que visite el
// sitio (no requiere sesión). Incluye foto, nombre y cumpleaños — el
// correo NO se expone aquí por privacidad (solo el admin lo ve, en el
// panel de administración). El estado de pago solo lo puede EDITAR el
// administrador, pero cualquiera puede verlo.
export const roster = query({
  args: {
    adminToken: v.optional(v.string()),
    clientToken: v.optional(v.string()),
  },
  handler: async (ctx) => {
    const all = await ctx.db.query("clients").order("desc").collect();
    return Promise.all(
      all.map(async (c) => ({
        _id: c._id,
        name: c.name ?? null,
        birthday: c.birthday ?? null,
        paid: c.paid,
        photoUrl: c.photoStorageId ? await ctx.storage.getUrl(c.photoStorageId) : null,
      }))
    );
  },
});

// Marca a un cliente como pagado (con fecha, categoría de membresía y
// monto) o pendiente. Al marcarlo como pagado, además de actualizar su
// estado, se guarda un registro en "payments" (para los cortes de caja
// por mes/año) y se le notifica por correo automáticamente.
export const setPaid = mutation({
  args: {
    token: v.string(),
    id: v.id("clients"),
    paid: v.boolean(),
    paymentDate: v.optional(v.string()), // "YYYY-MM-DD"
    category: v.optional(
      v.union(
        v.literal("caja"),
        v.literal("programacion"),
        v.literal("personalizado"),
        v.literal("kid")
      )
    ),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { token, id, paid, paymentDate, category, amount }) => {
    await requireAdmin(ctx, token);
    const client = await ctx.db.get(id);
    if (!client) throw new Error("Cliente no encontrado.");
    const patch: Record<string, unknown> = { paid };
    const dateUsed = paymentDate || new Date().toISOString().slice(0, 10);
    if (paid) {
      patch.lastPaymentDate = dateUsed;
    }
    await ctx.db.patch(id, patch);
    if (paid) {
      await ctx.db.insert("payments", {
        clientId: id,
        email: client.email,
        name: client.name,
        category: category || "caja",
        amount: amount ?? 0,
        date: dateUsed,
        createdAt: Date.now(),
      });
    }
    const subject = paid
      ? "Tu pago fue confirmado — Legacy Fitness"
      : "Aviso de pago pendiente — Legacy Fitness";
    const html = paid
      ? `<div style="font-family:sans-serif;padding:24px"><h2>¡Pago confirmado!</h2><p>Gracias, ya quedó registrado tu pago (${patch.lastPaymentDate}) en Legacy Fitness. ¡Nos vemos en el box!</p></div>`
      : `<div style="font-family:sans-serif;padding:24px"><h2>Pago pendiente</h2><p>Notamos que tu membresía sigue pendiente de pago. Si ya pagaste, ignora este mensaje.</p></div>`;
    await ctx.scheduler.runAfter(0, internal.email.sendEmail, { to: client.email, subject, html });
  },
});

// Elimina el perfil de un cliente — útil cuando la misma persona se
// registró dos veces con correos distintos y queda duplicada. Borra
// también su foto de perfil (si tenía), cualquier sesión activa que
// tuviera guardada y los códigos de acceso pendientes, para que el
// registro no deje rastros sueltos.
export const remove = mutation({
  args: { token: v.string(), id: v.id("clients") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const client = await ctx.db.get(id);
    if (!client) throw new Error("Cliente no encontrado.");

    if (client.photoStorageId) {
      await ctx.storage.delete(client.photoStorageId);
    }

    const sessions = await ctx.db.query("clientSessions").collect();
    for (const s of sessions) {
      if (s.email === client.email) await ctx.db.delete(s._id);
    }

    const codes = await ctx.db
      .query("loginCodes")
      .withIndex("by_email", (q) => q.eq("email", client.email))
      .collect();
    for (const c of codes) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(id);
  },
});

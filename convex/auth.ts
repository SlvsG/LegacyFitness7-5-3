import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Inicia sesión de administrador. La contraseña correcta se configura como
// variable de entorno ADMIN_PASSWORD en el dashboard de Convex (nunca vive
// en el código ni en el sitio).
export const login = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      throw new Error(
        "El servidor no tiene configurada la variable ADMIN_PASSWORD."
      );
    }
    if (password !== expected) {
      throw new Error("Contraseña incorrecta.");
    }
    const token = randomToken();
    const now = Date.now();
    await ctx.db.insert("sessions", {
      token,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });
    return { token, expiresAt: now + SESSION_TTL_MS };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// Utilidad usada por el resto de las funciones (products.ts, gallery.ts,
// wods.ts, horarios.ts) para exigir una sesión de administrador válida
// antes de escribir en la base de datos.
export async function requireAdmin(
  ctx: MutationCtx | QueryCtx,
  token: string | undefined
) {
  if (!token) throw new Error("No autorizado: falta iniciar sesión.");
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Sesión inválida o expirada. Vuelve a iniciar sesión.");
  }
}

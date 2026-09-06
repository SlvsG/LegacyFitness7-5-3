import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { requireClient } from "./clients";

// Calendario general (visible para cualquiera): solo WODs sin cliente asignado.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("scheduleWods").collect();
    return all.filter((w) => !w.clientEmail);
  },
});

// WODs personalizados del cliente que tiene la sesión iniciada.
export const listMine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const email = await requireClient(ctx, token);
    const all = await ctx.db
      .query("scheduleWods")
      .withIndex("by_client", (q) => q.eq("clientEmail", email))
      .collect();
    return all;
  },
});

// Vista completa para el administrador: calendario general + todos los
// WODs personalizados de todos los clientes (para poder editarlos).
export const listForAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.query("scheduleWods").collect();
  },
});

// Crea un WOD nuevo, o actualiza uno existente si se manda "id". Si se manda
// "clientEmail", el WOD queda asignado solo a ese cliente (no aparece en el
// calendario general, solo en el perfil de ese cliente y para el admin).
export const upsert = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("scheduleWods")),
    date: v.string(), // "YYYY-MM-DD"
    hour: v.string(), // "18:30"
    className: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    warmup: v.optional(v.string()),
    strength: v.optional(v.string()),
    main: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Links de YouTube opcionales (uno por bloque) con un video de ejemplo.
    warmupVideo: v.optional(v.string()),
    strengthVideo: v.optional(v.string()),
    mainVideo: v.optional(v.string()),
    notesVideo: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, ...data }) => {
    await requireAdmin(ctx, token);
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("scheduleWods", { ...data, updatedAt: Date.now() });
    }
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("scheduleWods") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

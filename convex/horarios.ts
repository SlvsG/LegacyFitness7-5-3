import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("horarios").collect();
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    block: v.union(v.literal("manana"), v.literal("tarde")),
    hora: v.string(),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, { token, block, hora, tag }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db
      .query("horarios")
      .withIndex("by_block", (q) => q.eq("block", block))
      .collect();
    await ctx.db.insert("horarios", { block, hora, tag, order: existing.length });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("horarios") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

// Llena los horarios conocidos de Legacy Fitness la primera vez que se usa
// el sitio (si la tabla está vacía). No requiere sesión de administrador
// porque solo actúa si no hay nada guardado todavía.
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("horarios").take(1);
    if (existing.length > 0) return;
    const manana = ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM"];
    const tarde: Array<[string, string | undefined]> = [
      ["2:30 PM", "Clase Kids"],
      ["3:30 PM", undefined],
      ["4:30 PM", undefined],
      ["5:30 PM", undefined],
      ["6:30 PM", "Horario más solicitado"],
      ["7:30 PM", undefined],
      ["8:30 PM", undefined],
    ];
    for (let i = 0; i < manana.length; i++) {
      await ctx.db.insert("horarios", { block: "manana", hora: manana[i], order: i });
    }
    for (let i = 0; i < tarde.length; i++) {
      await ctx.db.insert("horarios", {
        block: "tarde",
        hora: tarde[i][0],
        tag: tarde[i][1],
        order: i,
      });
    }
  },
});

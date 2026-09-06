import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Lista todos los productos con la URL de su foto ya resuelta,
// lista para usarse directamente como src="" en el sitio.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("products").order("desc").collect();
    return Promise.all(
      items.map(async (p) => ({
        ...p,
        imageUrl: p.imageStorageId
          ? await ctx.storage.getUrl(p.imageStorageId)
          : null,
      }))
    );
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    category: v.string(),
    price: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, ...data }) => {
    await requireAdmin(ctx, token);
    await ctx.db.insert("products", { ...data, createdAt: Date.now() });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("products"),
    name: v.string(),
    category: v.string(),
    price: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, id, ...data }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    // Si se subió una foto nueva y había una anterior, borra la vieja
    // para no dejar archivos huérfanos en el storage.
    if (
      existing?.imageStorageId &&
      data.imageStorageId &&
      existing.imageStorageId !== data.imageStorageId
    ) {
      await ctx.storage.delete(existing.imageStorageId);
    }
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (doc?.imageStorageId) await ctx.storage.delete(doc.imageStorageId);
    await ctx.db.delete(id);
  },
});

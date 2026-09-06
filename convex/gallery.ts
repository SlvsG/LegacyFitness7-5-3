import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("gallery").order("desc").collect();
    return Promise.all(
      items.map(async (g) => ({
        ...g,
        url: await ctx.storage.getUrl(g.storageId),
      }))
    );
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, { token, storageId, caption }) => {
    await requireAdmin(ctx, token);
    await ctx.db.insert("gallery", { storageId, caption, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("gallery") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (doc) await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(id);
  },
});

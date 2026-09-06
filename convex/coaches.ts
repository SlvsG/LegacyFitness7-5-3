import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("coaches").collect();
    const sorted = items.sort((a, b) => a.order - b.order);
    return Promise.all(
      sorted.map(async (c) => ({
        ...c,
        photoUrl: c.photoStorageId ? await ctx.storage.getUrl(c.photoStorageId) : null,
      }))
    );
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    about: v.optional(v.string()),
    birthday: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, ...data }) => {
    await requireAdmin(ctx, token);
    const count = (await ctx.db.query("coaches").collect()).length;
    await ctx.db.insert("coaches", { ...data, order: count });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("coaches"),
    name: v.string(),
    about: v.optional(v.string()),
    birthday: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { token, id, ...data }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (
      existing?.photoStorageId &&
      data.photoStorageId &&
      existing.photoStorageId !== data.photoStorageId
    ) {
      await ctx.storage.delete(existing.photoStorageId);
    }
    await ctx.db.patch(id, data);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("coaches") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const doc = await ctx.db.get(id);
    if (doc?.photoStorageId) await ctx.storage.delete(doc.photoStorageId);
    await ctx.db.delete(id);
  },
});

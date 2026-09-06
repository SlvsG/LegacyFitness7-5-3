import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { requireClient } from "./clients";

// Genera una URL temporal a la que el navegador puede subir una foto
// directamente (sin pasar por una función de Convex). Solo el administrador
// autenticado puede pedir una de estas URLs.
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

// Igual que la anterior, pero para un cliente logueado (usada solo para
// que suba su propia foto de perfil).
export const generateClientUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireClient(ctx, token);
    return await ctx.storage.generateUploadUrl();
  },
});

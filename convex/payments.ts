import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Lista todos los pagos registrados (uno por cada vez que se marcó a un
// cliente como "Pagó"). Solo el administrador puede verla — el frontend
// filtra/agrupa por mes o año para armar los cortes de caja.
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    return await ctx.db.query("payments").order("desc").collect();
  },
});

// Borra un registro de pago del corte de caja (por ejemplo, si se marcó
// "Pagó" dos veces por error y quedó duplicado). Esto NO cambia el estado
// de "paid" del cliente, solo quita esa entrada de los cortes.
export const remove = mutation({
  args: { token: v.string(), id: v.id("payments") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

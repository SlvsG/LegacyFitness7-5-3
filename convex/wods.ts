import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

const SECTION = v.union(v.literal("caja"), v.literal("programacion"));
const DAYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;

// Calcula el día de la semana en español a partir de una fecha "YYYY-MM-DD".
// Se guarda junto con la fecha por compatibilidad con el resto del sitio.
function dayFromDate(date: string): (typeof DAYS)[number] {
  const [y, m, d] = date.split("-").map(Number);
  const jsDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return DAYS[jsDate.getUTCDay()];
}

// Devuelve todos los WODs del tablero general (Caja / Programación).
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("wods").collect();
  },
});

// Crea o actualiza el WOD de una sección + fecha exacta. Si se manda "id",
// actualiza ese registro puntual; si no, busca uno existente para esa
// sección+fecha (para no duplicar) o crea uno nuevo.
export const upsert = mutation({
  args: {
    token: v.string(),
    id: v.optional(v.id("wods")),
    section: SECTION,
    date: v.string(), // "YYYY-MM-DD"
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
  handler: async (ctx, { token, id, section, date, ...data }) => {
    await requireAdmin(ctx, token);
    const day = dayFromDate(date);

    if (id) {
      await ctx.db.patch(id, { section, date, day, ...data, updatedAt: Date.now() });
      return;
    }

    const existing = await ctx.db
      .query("wods")
      .withIndex("by_section_date", (q) => q.eq("section", section).eq("date", date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { day, ...data, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("wods", { section, date, day, ...data, updatedAt: Date.now() });
    }
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("wods") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    await ctx.db.delete(id);
  },
});

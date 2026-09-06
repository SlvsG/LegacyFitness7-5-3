import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Guarda un "state" temporal antes de mandar al usuario a Google/Microsoft,
// para poder verificar que la respuesta que regresa es legítima.
export const storeState = internalMutation({
  args: { state: v.string(), provider: v.string() },
  handler: async (ctx, { state, provider }) => {
    await ctx.db.insert("oauthStates", {
      state,
      provider,
      expiresAt: Date.now() + STATE_TTL_MS,
      used: false,
    });
  },
});

// Verifica y consume un "state" (solo se puede usar una vez).
export const consumeState = internalMutation({
  args: { state: v.string(), provider: v.string() },
  handler: async (ctx, { state, provider }): Promise<boolean> => {
    const row = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", state))
      .unique();
    if (!row || row.used || row.provider !== provider || row.expiresAt < Date.now()) {
      return false;
    }
    await ctx.db.patch(row._id, { used: true });
    return true;
  },
});

// Crea (o reconoce) al cliente por su correo verificado por Google/Microsoft,
// y le abre una sesión — igual que el login por código, pero automático.
export const upsertClientAndSession = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { email, name }): Promise<string> => {
    const cleanEmail = email.trim().toLowerCase();
    let client = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .unique();
    if (!client) {
      const id = await ctx.db.insert("clients", {
        email: cleanEmail,
        name: name || undefined,
        paid: false,
        createdAt: Date.now(),
      });
      client = await ctx.db.get(id);
    } else if (name && !client.name) {
      await ctx.db.patch(client._id, { name });
    }

    const token = randomToken();
    const now = Date.now();
    await ctx.db.insert("clientSessions", {
      token,
      email: cleanEmail,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });
    return token;
  },
});

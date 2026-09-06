import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Catálogo de Norep Store — cada producto puede tener una foto guardada
  // en Convex File Storage (imageStorageId apunta a esa foto).
  products: defineTable({
    name: v.string(),
    category: v.string(),
    price: v.string(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }),

  // Fotos de la galería de comunidad, guardadas en Convex File Storage.
  gallery: defineTable({
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  }),

  // WOD del día, uno por combinación de sección (Caja / Programación) y fecha.
  wods: defineTable({
    section: v.union(v.literal("caja"), v.literal("programacion")),
    day: v.union(
      v.literal("lunes"),
      v.literal("martes"),
      v.literal("miercoles"),
      v.literal("jueves"),
      v.literal("viernes"),
      v.literal("sabado"),
      v.literal("domingo")
    ),
    date: v.optional(v.string()), // "YYYY-MM-DD" — fecha real asignada por el admin
    warmup: v.optional(v.string()),
    strength: v.optional(v.string()),
    main: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Links de YouTube opcionales (uno por bloque) para que el cliente vea
    // un video de ejemplo de cómo hacer el movimiento.
    warmupVideo: v.optional(v.string()),
    strengthVideo: v.optional(v.string()),
    mainVideo: v.optional(v.string()),
    notesVideo: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_section_day", ["section", "day"])
    .index("by_section_date", ["section", "date"]),

  // Horarios de clase por bloque (mañana / tarde).
  horarios: defineTable({
    block: v.union(v.literal("manana"), v.literal("tarde")),
    hora: v.string(),
    tag: v.optional(v.string()),
    order: v.number(),
  }).index("by_block", ["block"]),

  // Sesiones de administrador (autenticación simple por token).
  sessions: defineTable({
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // Estados temporales de OAuth (Google / Microsoft), para evitar
  // ataques de tipo CSRF durante el login social.
  oauthStates: defineTable({
    state: v.string(),
    provider: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_state", ["state"]),

  // ---------- Clientes (v2) ----------

  // Clientes registrados (login por correo + código, sin contraseña).
  clients: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    birthday: v.optional(v.string()), // "YYYY-MM-DD"
    photoStorageId: v.optional(v.id("_storage")),
    paid: v.boolean(),
    lastPaymentDate: v.optional(v.string()), // "YYYY-MM-DD"
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Códigos de un solo uso enviados por correo para iniciar sesión.
  loginCodes: defineTable({
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_email", ["email"]),

  // Sesiones de cliente (separadas de las de administrador).
  clientSessions: defineTable({
    token: v.string(),
    email: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // Coaches del box.
  coaches: defineTable({
    name: v.string(),
    about: v.optional(v.string()),
    birthday: v.optional(v.string()), // "MM-DD" o "YYYY-MM-DD"
    photoStorageId: v.optional(v.id("_storage")),
    order: v.number(),
  }),

  // WODs personalizados por fecha de calendario + hora + clase (Lun-Vie).
  // Si "clientEmail" tiene valor, es un WOD asignado a un cliente específico
  // (solo ese cliente y el admin lo ven); si no, es del calendario general.
  scheduleWods: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    hour: v.string(), // "18:30"
    className: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    warmup: v.optional(v.string()),
    strength: v.optional(v.string()),
    main: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Links de YouTube opcionales (uno por bloque) para que el cliente vea
    // un video de ejemplo de cómo hacer el movimiento.
    warmupVideo: v.optional(v.string()),
    strengthVideo: v.optional(v.string()),
    mainVideo: v.optional(v.string()),
    notesVideo: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_client", ["clientEmail"]),

  // Un registro por cada vez que el admin marca a un cliente como "Pagó"
  // (con categoría de membresía y monto). Es la base de los cortes de
  // caja por mes/año.
  payments: defineTable({
    clientId: v.optional(v.id("clients")),
    email: v.string(),
    name: v.optional(v.string()),
    category: v.union(
      v.literal("caja"),
      v.literal("programacion"),
      v.literal("personalizado"),
      v.literal("kid")
    ),
    amount: v.number(),
    date: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  }).index("by_date", ["date"]),
});

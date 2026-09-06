"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Envía un correo usando la API de SendGrid. Requiere las variables de
// entorno SENDGRID_API_KEY y SENDGRID_FROM configuradas en el dashboard
// de Convex (Settings > Environment Variables), tanto en Development
// como en Production.
//
// A diferencia de otros proveedores, SendGrid permite verificar UNA SOLA
// dirección de correo (Single Sender Verification) sin necesitar un
// dominio propio — y aun así enviar a cualquier destinatario (Gmail,
// Outlook, Hotmail, etc.). Ver GUIA-V2-CLIENTES-Y-CORREOS.md.
//
// Es una acción "interna": solo la puede llamar otro código del servidor
// (por ejemplo, clients.ts), nunca directamente desde el sitio web.
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, { to, subject, html }) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromAddress = process.env.SENDGRID_FROM;
    if (!apiKey || !fromAddress) {
      throw new Error(
        "Falta configurar SENDGRID_API_KEY y SENDGRID_FROM en Convex."
      );
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromAddress, name: "Legacy Fitness" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SendGrid error (${res.status}): ${text}`);
    }
    return { ok: true };
  },
});

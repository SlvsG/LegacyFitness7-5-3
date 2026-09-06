import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ============================================================
   GOOGLE
   ============================================================ */

http.route({
  path: "/oauth/google/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return new Response("Falta configurar GOOGLE_CLIENT_ID en Convex.", { status: 500 });
    }
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/oauth/google/callback`;
    const state = randomState();
    await ctx.runMutation(internal.oauth.storeState, { state, provider: "google" });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
  }),
});

http.route({
  path: "/oauth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const origin = url.origin;
    const siteUrl = process.env.SITE_URL || origin;

    if (!code || !state) {
      return Response.redirect(`${siteUrl}/?auth_error=missing_code`, 302);
    }
    const validState = await ctx.runMutation(internal.oauth.consumeState, { state, provider: "google" });
    if (!validState) {
      return Response.redirect(`${siteUrl}/?auth_error=invalid_state`, 302);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return new Response("Faltan credenciales de Google en Convex.", { status: 500 });
    }

    const redirectUri = `${origin}/oauth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!tokenRes.ok) {
      return Response.redirect(`${siteUrl}/?auth_error=token_exchange_failed`, 302);
    }
    const tokenData: { access_token?: string } = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.redirect(`${siteUrl}/?auth_error=no_access_token`, 302);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      return Response.redirect(`${siteUrl}/?auth_error=userinfo_failed`, 302);
    }
    const profile: { email?: string; name?: string } = await userRes.json();
    if (!profile.email) {
      return Response.redirect(`${siteUrl}/?auth_error=no_email`, 302);
    }

    const token: string = await ctx.runMutation(internal.oauth.upsertClientAndSession, {
      email: profile.email,
      name: profile.name,
    });
    return Response.redirect(`${siteUrl}/?ct=${token}`, 302);
  }),
});

/* ============================================================
   MICROSOFT (Outlook / Hotmail)
   ============================================================ */

http.route({
  path: "/oauth/microsoft/start",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return new Response("Falta configurar MICROSOFT_CLIENT_ID en Convex.", { status: 500 });
    }
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/oauth/microsoft/callback`;
    const state = randomState();
    await ctx.runMutation(internal.oauth.storeState, { state, provider: "microsoft" });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      response_mode: "query",
      scope: "openid email profile User.Read",
      state,
    });
    return Response.redirect(
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`,
      302
    );
  }),
});

http.route({
  path: "/oauth/microsoft/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const origin = url.origin;
    const siteUrl = process.env.SITE_URL || origin;

    if (!code || !state) {
      return Response.redirect(`${siteUrl}/?auth_error=missing_code`, 302);
    }
    const validState = await ctx.runMutation(internal.oauth.consumeState, { state, provider: "microsoft" });
    if (!validState) {
      return Response.redirect(`${siteUrl}/?auth_error=invalid_state`, 302);
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return new Response("Faltan credenciales de Microsoft en Convex.", { status: 500 });
    }

    const redirectUri = `${origin}/oauth/microsoft/callback`;
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid email profile User.Read",
      }).toString(),
    });
    if (!tokenRes.ok) {
      return Response.redirect(`${siteUrl}/?auth_error=token_exchange_failed`, 302);
    }
    const tokenData: { access_token?: string } = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.redirect(`${siteUrl}/?auth_error=no_access_token`, 302);
    }

    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      return Response.redirect(`${siteUrl}/?auth_error=userinfo_failed`, 302);
    }
    const profile: { mail?: string; userPrincipalName?: string; displayName?: string } = await userRes.json();
    const email = profile.mail || profile.userPrincipalName;
    if (!email) {
      return Response.redirect(`${siteUrl}/?auth_error=no_email`, 302);
    }

    const token: string = await ctx.runMutation(internal.oauth.upsertClientAndSession, {
      email,
      name: profile.displayName,
    });
    return Response.redirect(`${siteUrl}/?ct=${token}`, 302);
  }),
});

export default http;

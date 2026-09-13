import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { setSessionCookie } from "@/lib/http";
import { getSsoConfig, findOrCreateSsoUser } from "@keystone/domain";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";

const OKTA_REDIRECT_URI = process.env.OKTA_REDIRECT_URI ?? "";
const OKTA_ISSUER_ENV = process.env.OKTA_ISSUER ?? "";
const OKTA_CLIENT_ID_ENV = process.env.OKTA_CLIENT_ID ?? "";
const OKTA_CLIENT_SECRET_ENV = process.env.OKTA_CLIENT_SECRET ?? "";

export async function GET(request: Request) {
  const appUrl = new URL(request.url);
  const code = appUrl.searchParams.get("code");
  const state = appUrl.searchParams.get("state"); // orgId
  const error = appUrl.searchParams.get("error");

  if (error) {
    const desc = appUrl.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(desc)}`, appUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=Missing+code+or+state", appUrl));
  }

  const orgId = state;

  try {
    const db = await getDb();

    // Load per-org SSO config, fall back to env
    let config = await getSsoConfig(db, orgId);
    if (!config && OKTA_ISSUER_ENV && OKTA_CLIENT_ID_ENV) {
      config = {
        issuer: OKTA_ISSUER_ENV,
        clientId: OKTA_CLIENT_ID_ENV,
        clientSecret: OKTA_CLIENT_SECRET_ENV,
        enabled: true,
      };
    }

    if (!config || !config.enabled) {
      return NextResponse.redirect(new URL("/login?error=SSO+not+configured", appUrl));
    }

    // Exchange authorization code for tokens
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("ks_sso_pkce")?.value ?? "";

    const tokenRes = await fetch(`${config.issuer}/oauth2/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: OKTA_REDIRECT_URI,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    // Clear PKCE cookie
    cookieStore.delete("ks_sso_pkce");

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[okta/callback] token exchange failed:", body);
      return NextResponse.redirect(new URL("/login?error=Token+exchange+failed", appUrl));
    }

    const tokenData = await tokenRes.json();
    const idToken: string = tokenData.id_token;

    if (!idToken) {
      return NextResponse.redirect(new URL("/login?error=No+id_token", appUrl));
    }

    // Verify id_token using Okta's JWKS
    const jwksUri = new URL(`${config.issuer}/oauth2/v1/keys`);
    const JWKS = createRemoteJWKSet(jwksUri);

    const storedNonce = cookieStore.get("ks_sso_nonce")?.value ?? "";

    const { payload: claims } = await jwtVerify(idToken, JWKS, {
      issuer: config.issuer,
      audience: config.clientId,
    });

    // Validate nonce
    if (claims.nonce && storedNonce && claims.nonce !== storedNonce) {
      return NextResponse.redirect(new URL("/login?error=Nonce+mismatch", appUrl));
    }

    // Clear nonce cookie
    cookieStore.delete("ks_sso_nonce");

    const email = claims.email as string;
    const name = (claims.name as string) || (claims.preferred_username as string) || email;
    const sub = claims.sub as string;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=No+email+in+token", appUrl));
    }

    // Find or create the Keystone user and issue a session
    const ksToken = await findOrCreateSsoUser(db, {
      email,
      name,
      sub,
      issuer: config.issuer,
      orgId,
    });

    await setSessionCookie(ksToken);

    // Clear nonce cookie and redirect to app
    const response = NextResponse.redirect(new URL("/app", appUrl));
    return response;
  } catch (err: any) {
    console.error("[okta/callback]", err);
    const msg = encodeURIComponent(err.message || "SSO callback failed");
    return NextResponse.redirect(new URL(`/login?error=${msg}`, appUrl));
  }
}

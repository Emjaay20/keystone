import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { setSessionCookie } from "@/lib/http";
import { getSsoConfig, findOrCreateSsoUser } from "@keystone/domain";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { oktaEndpoints, oktaRedirectUri, publicOrigin } from "@/lib/okta";

const OKTA_ISSUER_ENV = process.env.OKTA_ISSUER ?? "";
const OKTA_CLIENT_ID_ENV = process.env.OKTA_CLIENT_ID ?? "";
const OKTA_CLIENT_SECRET_ENV = process.env.OKTA_CLIENT_SECRET ?? "";

export async function GET(request: Request) {
  const appUrl = new URL(request.url);
  const origin = publicOrigin(request);
  const code = appUrl.searchParams.get("code");
  const state = appUrl.searchParams.get("state");
  const error = appUrl.searchParams.get("error");

  if (error) {
    const desc = appUrl.searchParams.get("error_description") ?? error;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(desc)}`, origin));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=Missing+code+or+state", origin));
  }

  const orgId = state;

  try {
    const db = await getDb();

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
      return NextResponse.redirect(new URL("/login?error=SSO+not+configured", origin));
    }

    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get("ks_sso_pkce")?.value ?? "";
    const redirectUri = oktaRedirectUri(request);
    const endpoints = oktaEndpoints(config.issuer);

    const params: any = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };
    if (!config.clientSecret) {
      params.client_id = config.clientId;
    }
    const tokenParams = new URLSearchParams(params);

    const tokenHeaders: HeadersInit = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    if (config.clientSecret) {
      tokenHeaders["Authorization"] = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
    }

    const tokenRes = await fetch(endpoints.token, {
      method: "POST",
      headers: tokenHeaders,
      body: tokenParams,
    });

    cookieStore.delete("ks_sso_pkce");

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[okta/callback] token exchange failed:", body);
      const errMsg = encodeURIComponent(`Token exchange failed: ${body}`); return NextResponse.redirect(new URL(`/login?error=${errMsg}`, origin));
    }

    const tokenData = await tokenRes.json();
    const idToken: string = tokenData.id_token;

    if (!idToken) {
      return NextResponse.redirect(new URL("/login?error=No+id_token", origin));
    }

    const JWKS = createRemoteJWKSet(new URL(endpoints.jwks));
    const storedNonce = cookieStore.get("ks_sso_nonce")?.value ?? "";

    const { payload: claims } = await jwtVerify(idToken, JWKS, {
      issuer: endpoints.issuer,
      audience: config.clientId,
    });

    if (claims.nonce && storedNonce && claims.nonce !== storedNonce) {
      return NextResponse.redirect(new URL("/login?error=Nonce+mismatch", origin));
    }

    cookieStore.delete("ks_sso_nonce");

    const email = claims.email as string;
    const name = (claims.name as string) || (claims.preferred_username as string) || email;
    const sub = claims.sub as string;

    if (!email) {
      return NextResponse.redirect(new URL("/login?error=No+email+in+token", origin));
    }

    const ksToken = await findOrCreateSsoUser(db, {
      email,
      name,
      sub,
      issuer: endpoints.issuer,
      orgId,
    });

    await setSessionCookie(ksToken);

    return NextResponse.redirect(new URL("/app", origin));
  } catch (err: any) {
    console.error("[okta/callback]", err);
    const msg = encodeURIComponent(err.message || "SSO callback failed");
    return NextResponse.redirect(new URL(`/login?error=${msg}`, origin));
  }
}

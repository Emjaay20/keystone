import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSsoConfig } from "@keystone/domain";
import { orgs } from "@keystone/domain";
import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";

const OKTA_ISSUER = process.env.OKTA_ISSUER ?? "";
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID ?? "";
const OKTA_REDIRECT_URI = process.env.OKTA_REDIRECT_URI ?? "";

function base64URLEncode(buffer: Buffer) {
  return buffer.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("org_id");

    if (!orgId) {
      return NextResponse.json({ message: "org_id required" }, { status: 400 });
    }

    const db = await getDb();

    // Load per-org SSO config (from sso_connections), fall back to env vars
    let config = await getSsoConfig(db, orgId);

    // Fall back to environment-level Okta config if no per-org config
    if (!config && OKTA_ISSUER && OKTA_CLIENT_ID) {
      config = {
        issuer: OKTA_ISSUER,
        clientId: OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET ?? "",
        enabled: true,
      };
    }

    if (!config || !config.enabled) {
      return NextResponse.json({ message: "SSO not configured for this org" }, { status: 400 });
    }

    // Generate nonce, state, and PKCE verifier
    const nonce = randomBytes(16).toString("hex");
    const state = orgId; // we use orgId as state
    const codeVerifier = base64URLEncode(randomBytes(32));
    const codeChallenge = base64URLEncode(createHash("sha256").update(codeVerifier).digest());

    const cookieStore = await cookies();
    cookieStore.set("ks_sso_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });
    
    // Store PKCE verifier in a cookie for the callback to use
    cookieStore.set("ks_sso_pkce", codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authorizeUrl = new URL(`${config.issuer}/oauth2/v1/authorize`);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid email profile");
    authorizeUrl.searchParams.set("redirect_uri", OKTA_REDIRECT_URI);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("nonce", nonce);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.redirect(authorizeUrl.toString());
  } catch (err: any) {
    console.error("[okta/authorize]", err);
    return NextResponse.json({ message: err.message || "Authorization failed" }, { status: 500 });
  }
}

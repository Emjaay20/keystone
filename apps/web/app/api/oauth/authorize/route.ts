import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSessionToken } from "@/lib/http";
import { startAuthorize } from "@keystone/domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");
  const responseType = url.searchParams.get("response_type");

  if (!clientId || !redirectUri || !state || !codeChallenge || codeChallengeMethod !== "S256" || responseType !== "code") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    // Redirect to login, preserving all parameters in returnTo
    const returnTo = encodeURIComponent(url.pathname + url.search);
    return NextResponse.redirect(new URL(`/login?returnTo=${returnTo}`, request.url));
  }

  const db = await getDb();

  try {
    const { redirectTo } = await startAuthorize(db, {
      rawToken: sessionToken,
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
    });
    return NextResponse.redirect(redirectTo);
  } catch (err: any) {
    if (err.status === 401) {
      const returnTo = encodeURIComponent(url.pathname + url.search);
      return NextResponse.redirect(new URL(`/login?returnTo=${returnTo}`, request.url));
    }
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { exchangeCode } from "@keystone/domain";

export async function POST(request: Request) {
  try {
    // OAuth token requests usually use application/x-www-form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);

    const grantType = params.get("grant_type");
    const clientId = params.get("client_id");
    const clientSecret = params.get("client_secret") || undefined;
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const codeVerifier = params.get("code_verifier");

    if (grantType !== "authorization_code") {
      return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
    }

    if (!clientId || !code || !redirectUri || !codeVerifier) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const db = await getDb();
    
    const tokenResponse = await exchangeCode(db, {
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier,
    });

    return NextResponse.json(tokenResponse);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

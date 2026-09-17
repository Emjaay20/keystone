import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { configureSso, getSsoConfigAuthenticated } from "@keystone/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    const config = await getSsoConfigAuthenticated(db, token, orgId);
    return NextResponse.json(config ?? { configured: false });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    const body = await request.json();
    const result = await configureSso(db, {
      rawToken: token,
      orgId,
      issuer: typeof body.issuer === "string" ? body.issuer.trim().replace(/\/$/, "") : body.issuer,
      clientId: body.clientId,
      clientSecret: body.clientSecret,
      enabled: body.enabled,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

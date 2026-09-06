import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { setGrant, listGrants } from "@keystone/domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    
    const grantsList = await listGrants(db, token, orgId);
    return NextResponse.json(grantsList);
  } catch (error) {
    return handleApiError(error);
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
    
    await setGrant(db, {
      rawToken: token,
      orgId,
      userId: body.userId,
      product: body.product,
      level: body.level,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      reason: body.reason || "Set grant via UI",
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

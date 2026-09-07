import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { revokeApiKey } from "@keystone/domain";

export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string, keyId: string }> }) {
  try {
    const { orgId, keyId } = await params;
    const token = await getSessionToken();
    const db = await getDb();
    
    await revokeApiKey(db, token, orgId, keyId);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleApiError(err);
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { listAudit } from "@keystone/domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    
    // Get URL params for limit
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const auditList = await listAudit(db, token, orgId, limit);
    return NextResponse.json(auditList);
  } catch (error) {
    return handleApiError(error);
  }
}

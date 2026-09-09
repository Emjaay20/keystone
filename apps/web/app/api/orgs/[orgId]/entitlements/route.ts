import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { getOrgEntitlements } from "@keystone/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    const result = await getOrgEntitlements(db, token, orgId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

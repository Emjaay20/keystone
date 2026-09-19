import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { listMembers } from "@keystone/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    const members = await listMembers(db, token, orgId);
    return NextResponse.json(members);
  } catch (error) {
    return handleApiError(error);
  }
}

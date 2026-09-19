import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { removeMember } from "@keystone/domain";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId, userId } = await params;
    await removeMember(db, token, orgId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

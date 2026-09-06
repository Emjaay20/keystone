import { NextResponse } from "next/server";
import { createInvite, listInvites } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const resolvedParams = await params;
    
    const invites = await listInvites(db, token, resolvedParams.orgId);
    return NextResponse.json(invites);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const resolvedParams = await params;
    const body = await request.json();
    
    const result = await createInvite(db, token, resolvedParams.orgId, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

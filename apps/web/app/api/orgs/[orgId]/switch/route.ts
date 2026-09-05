import { NextResponse } from "next/server";
import { switchOrg } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, setSessionCookie, handleApiError } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const cookieToken = await getSessionToken();
    const resolvedParams = await params;
    const { token, payload } = await switchOrg(db, cookieToken, resolvedParams);
    await setSessionCookie(token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

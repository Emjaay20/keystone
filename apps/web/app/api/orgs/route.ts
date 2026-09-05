import { NextResponse } from "next/server";
import { createOrg, listOrgs } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const body = await request.json();
    const payload = await createOrg(db, token, body);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const payload = await listOrgs(db, token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

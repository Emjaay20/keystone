import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { createApiKey, listApiKeys } from "@keystone/domain";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const token = await getSessionToken();
    const db = await getDb();
    const keys = await listApiKeys(db, token, orgId);
    return NextResponse.json(keys);
  } catch (err: any) {
    return handleApiError(err);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const token = await getSessionToken();
    const body = await request.json();
    const db = await getDb();
    
    const key = await createApiKey(db, {
      rawToken: token,
      orgId,
      name: body.name,
      product: body.product,
      level: body.level,
    });
    
    return NextResponse.json(key);
  } catch (err: any) {
    return handleApiError(err);
  }
}

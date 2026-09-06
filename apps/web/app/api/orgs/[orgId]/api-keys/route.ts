import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { createApiKey, listApiKeys } from "@keystone/domain";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    const db = await getDb();
    const keys = await listApiKeys(db, token, orgId);
    return NextResponse.json(keys);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
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
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

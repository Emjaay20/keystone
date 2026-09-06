import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { createOauthClient, listOauthClients } from "@keystone/domain";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    const db = await getDb();
    const clients = await listOauthClients(db, token, orgId);
    return NextResponse.json(clients);
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
    
    const client = await createOauthClient(db, {
      rawToken: token,
      orgId,
      name: body.name,
      redirectUris: body.redirectUris,
    });
    
    return NextResponse.json(client);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

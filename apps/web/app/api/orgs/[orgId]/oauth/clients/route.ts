import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { createOauthClient, listOauthClients } from "@keystone/domain";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;
    const token = await getSessionToken();
    const db = await getDb();
    const clients = await listOauthClients(db, token, orgId);
    return NextResponse.json(clients);
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
    
    const client = await createOauthClient(db, {
      rawToken: token,
      orgId,
      name: body.name,
      redirectUris: body.redirectUris,
    });
    
    return NextResponse.json(client);
  } catch (err: any) {
    return handleApiError(err);
  }
}

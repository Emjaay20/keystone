import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { revokeApiKey } from "@keystone/domain";

export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string, keyId: string }> }) {
  try {
    const { orgId, keyId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    const db = await getDb();
    
    await revokeApiKey(db, token, orgId, keyId);
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

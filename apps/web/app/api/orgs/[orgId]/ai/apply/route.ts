import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyProposal } from "@keystone/domain";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const rawToken = cookieStore.get("ks_session")?.value;

    const db = await getDb();
    const result = await applyProposal(db, {
      rawToken,
      orgId,
      command: body.command,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[api/ai/apply]", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}

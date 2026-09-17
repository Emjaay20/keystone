import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { proposeGrant } from "@keystone/domain";
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
    const command = await proposeGrant(db, {
      rawToken,
      orgId,
      prompt: body.prompt,
    });

    return NextResponse.json(command);
  } catch (err: any) {
    console.error("[api/ai/propose]", err);
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}

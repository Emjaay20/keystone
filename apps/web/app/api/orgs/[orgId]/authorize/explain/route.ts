import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";
import { explainDeny, requireUser } from "@keystone/domain";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const { orgId } = await params;
    const body = await request.json();
    
    // We need to load the user context first to pass to explainDeny
    const ctx = await requireUser(db, token);
    
    const result = await explainDeny(db, ctx, {
      orgId,
      product: body.product,
      productAction: body.productAction
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionToken } from "@/lib/http";
import { authorize, requireUser, authenticateBearer } from "@keystone/domain";

export async function GET(
  request: Request
) {
  try {
    const db = await getDb();
    
    // Check Authorization header first
    const authHeader = request.headers.get("authorization") || undefined;
    let ctx: any = await authenticateBearer(db, authHeader);
    
    // Fallback to cookie session
    if (!ctx) {
      const token = await getSessionToken();
      ctx = await requireUser(db, token);
    }
    
    if (!ctx.org) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }
    
    // 2. Authorize MailGuard export
    const authResult = await authorize(db, ctx, {
      orgId: ctx.org._id.toString(),
      product: "mailguard",
      productAction: "operate" // Or admin, both work if grant level >= operate
    });
    
    // 3. Return 403 with reason if denied
    if (!authResult.allow) {
      return NextResponse.json({
        error: "Forbidden",
        reasonCode: authResult.reasonCode,
        reason: authResult.reason
      }, { status: 403 });
    }
    
    // 4. Return success if allowed
    return NextResponse.json({
      success: true,
      message: "Export completed successfully. This is a stub.",
      data: [
        { id: 1, email: "foo@example.com", status: "passed" },
        { id: 2, email: "bar@example.com", status: "failed" }
      ]
    });
  } catch (error: any) {
    // If it's our HttpError with status 401
    if (error.status) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { acceptInvite } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const body = await request.json();
    
    const result = await acceptInvite(db, token, body);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

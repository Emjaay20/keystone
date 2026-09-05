import { NextResponse } from "next/server";
import { logout } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, clearSessionCookie, handleApiError } from "@/lib/http";

export async function POST() {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const result = await logout(db, token);
    await clearSessionCookie();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

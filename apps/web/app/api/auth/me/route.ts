import { NextResponse } from "next/server";
import { me } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { getSessionToken, handleApiError } from "@/lib/http";

export async function GET() {
  try {
    const db = await getDb();
    const token = await getSessionToken();
    const payload = await me(db, token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

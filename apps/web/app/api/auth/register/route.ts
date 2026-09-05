import { NextResponse } from "next/server";
import { register } from "@keystone/domain";
import { getDb } from "@/lib/db";
import { setSessionCookie, handleApiError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { token, payload } = await register(db, body);
    await setSessionCookie(token);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

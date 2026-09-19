import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/http";
import { discoverSsoLogin } from "@keystone/domain";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    if (!slug.trim()) {
      return NextResponse.json({ message: "Organization slug required" }, { status: 400 });
    }
    const db = await getDb();
    const result = await discoverSsoLogin(db, slug);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

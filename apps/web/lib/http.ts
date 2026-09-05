import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { HttpError } from "@keystone/domain";
import { ZodError } from "zod";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@keystone/shared";

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError || (error as Error).name === "ZodError") {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid request",
        details: (error as ZodError).flatten ? (error as ZodError).flatten() : error
      },
      { status: 400 }
    );
  }
  if (error instanceof HttpError || (error as Error).name === "HttpError") {
    return NextResponse.json(
      { error: (error as HttpError).code, message: (error as Error).message },
      { status: (error as HttpError).statusCode }
    );
  }
  console.error("API Error:", error);
  return NextResponse.json(
    { error: "internal", message: "Something went wrong" },
    { status: 500 }
  );
}

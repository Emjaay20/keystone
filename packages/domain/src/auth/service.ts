import { z } from "zod";
import { ObjectId } from "mongodb";
import { PASSWORD_MIN_LENGTH } from "@keystone/shared";
import type { Db } from "mongodb";
import { users } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { hashPassword, verifyPassword } from "../security/crypto.js";
import { createSession, requireUser, toSessionPayload } from "./session.js";

export const registerBody = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2).max(80).trim(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200)
});

export const loginBody = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(200)
});

export async function register(db: Db, payload: unknown) {
  const body = registerBody.parse(payload);
  const existing = await users(db).findOne({ email: body.email });
  if (existing) {
    throw errors.conflict("An account with this email already exists");
  }

  const now = new Date();
  const userId = new ObjectId();
  await users(db).insertOne({
    _id: userId,
    email: body.email,
    name: body.name,
    passwordHash: await hashPassword(body.password),
    createdAt: now,
    updatedAt: now
  });

  const token = await createSession(db, userId, null);
  const user = await users(db).findOne({ _id: userId });
  return { token, payload: toSessionPayload(user!, null, null) };
}

export async function login(db: Db, payload: unknown) {
  const body = loginBody.parse(payload);
  const user = await users(db).findOne({ email: body.email });
  const dummy =
    "scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
  const ok = await verifyPassword(user?.passwordHash ?? dummy, body.password);

  if (!user || !ok) {
    throw errors.unauthorized("Invalid email or password");
  }

  const token = await createSession(db, user._id, null);
  return { token, payload: toSessionPayload(user, null, null) };
}

export async function logout(db: Db, token: string | undefined) {
  const ctx = await requireUser(db, token).catch(() => null);
  if (ctx) {
    await db.collection("sessions").updateOne(
      { _id: ctx.session._id },
      { $set: { revokedAt: new Date() } }
    );
  }
  return { ok: true };
}

export async function me(db: Db, token: string | undefined) {
  const ctx = await requireUser(db, token);
  return toSessionPayload(ctx.user, ctx.org, ctx.membership?.role ?? null);
}

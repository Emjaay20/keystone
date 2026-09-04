import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { PASSWORD_MIN_LENGTH } from "@keystone/shared";
import type { AppEnv } from "../../config/env.js";
import type { Database } from "../../db/client.js";
import { users } from "../../db/collections.js";
import { errors } from "../../http/errors.js";
import { hashPassword, verifyPassword } from "../../security/crypto.js";
import {
  clearSessionCookie,
  createSession,
  requireUser,
  setSessionCookie,
  toSessionPayload
} from "./session.js";

const registerBody = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  name: z.string().min(2).max(80).trim(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200)
});

const loginBody = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1).max(200)
});

export async function authRoutes(
  app: FastifyInstance,
  deps: { db: Database; env: AppEnv }
) {
  const { db } = deps.db;

  app.post("/auth/register", async (request, reply) => {
    const body = registerBody.parse(request.body);
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
    setSessionCookie(reply, token, deps.env.cookieSecure);
    const user = await users(db).findOne({ _id: userId });
    return toSessionPayload(user!, null, null);
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginBody.parse(request.body);
    const user = await users(db).findOne({ email: body.email });
    const dummy =
      "scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
    const ok = await verifyPassword(user?.passwordHash ?? dummy, body.password);

    if (!user || !ok) {
      throw errors.unauthorized("Invalid email or password");
    }

    const token = await createSession(db, user._id, null);
    setSessionCookie(reply, token, deps.env.cookieSecure);
    return toSessionPayload(user, null, null);
  });

  app.post("/auth/logout", async (request, reply) => {
    const ctx = await requireUser(deps.db.db, request).catch(() => null);
    if (ctx) {
      await deps.db.db.collection("sessions").updateOne(
        { _id: ctx.session._id },
        { $set: { revokedAt: new Date() } }
      );
    }
    clearSessionCookie(reply, deps.env.cookieSecure);
    return { ok: true };
  });

  app.get("/auth/me", async (request) => {
    const ctx = await requireUser(db, request);
    return toSessionPayload(ctx.user, ctx.org, ctx.membership?.role ?? null);
  });
}

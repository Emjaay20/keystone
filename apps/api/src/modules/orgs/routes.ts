import type { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Database } from "../../db/client.js";
import { memberships, orgs } from "../../db/collections.js";
import { errors } from "../../http/errors.js";
import { publicOrg } from "../../http/public.js";
import { slugify } from "../../security/crypto.js";
import {
  createSession,
  requireUser,
  setSessionCookie,
  toSessionPayload
} from "../auth/session.js";
import type { AppEnv } from "../../config/env.js";

const createOrgBody = z.object({
  name: z.string().min(2).max(80).trim()
});

export async function orgRoutes(
  app: FastifyInstance,
  deps: { db: Database; env: AppEnv }
) {
  const { db } = deps.db;

  app.post("/orgs", async (request, reply) => {
    const ctx = await requireUser(db, request);
    const body = createOrgBody.parse(request.body);

    const slug = `${slugify(body.name)}-${ctx.user._id.toHexString().slice(-6)}`;
    const now = new Date();
    const orgId = new ObjectId();

    await orgs(db).insertOne({
      _id: orgId,
      name: body.name,
      slug,
      plan: "free",
      seatLimit: 5,
      createdAt: now,
      updatedAt: now
    });

    await memberships(db).insertOne({
      _id: new ObjectId(),
      orgId,
      userId: ctx.user._id,
      role: "owner",
      status: "active",
      createdAt: now
    });

    // Switch the current session into this org so /auth/me is immediately useful.
    await db.collection("sessions").updateOne(
      { _id: ctx.session._id },
      { $set: { orgId } }
    );

    const org = await orgs(db).findOne({ _id: orgId });
    return toSessionPayload(ctx.user, org, "owner");
  });

  app.get("/orgs", async (request) => {
    const ctx = await requireUser(db, request);
    const mine = await memberships(db)
      .find({ userId: ctx.user._id, status: "active" })
      .toArray();
    const orgIds = mine.map((m) => m.orgId);
    const list = await orgs(db)
      .find({ _id: { $in: orgIds } })
      .toArray();

    return {
      orgs: list.map((org) => {
        const membership = mine.find((m) => m.orgId.equals(org._id));
        return {
          ...publicOrg(org),
          role: membership?.role ?? "readonly"
        };
      })
    };
  });

  app.post("/orgs/:orgId/switch", async (request, reply) => {
    const ctx = await requireUser(db, request);
    const params = z.object({ orgId: z.string().length(24) }).parse(request.params);
    const orgId = new ObjectId(params.orgId);

    const membership = await memberships(db).findOne({
      orgId,
      userId: ctx.user._id,
      status: "active"
    });
    if (!membership) throw errors.forbidden("You are not a member of this organization");

    const org = await orgs(db).findOne({ _id: orgId });
    if (!org) throw errors.notFound("Organization not found");

    // Rotate the session token when switching tenants.
    await db.collection("sessions").updateOne(
      { _id: ctx.session._id },
      { $set: { revokedAt: new Date() } }
    );
    const token = await createSession(db, ctx.user._id, orgId);
    setSessionCookie(reply, token, deps.env.cookieSecure);
    return toSessionPayload(ctx.user, org, membership.role);
  });
}

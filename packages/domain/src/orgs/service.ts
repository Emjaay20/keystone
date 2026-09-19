import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Db } from "mongodb";
import { memberships, orgs, users } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { publicOrg } from "../http/public.js";
import { slugify } from "../security/crypto.js";
import { createSession, requireUser, toSessionPayload } from "../auth/session.js";

export const createOrgBody = z.object({
  name: z.string().min(2).max(80).trim()
});

export const switchOrgParams = z.object({ 
  orgId: z.string().length(24) 
});

export async function createOrg(db: Db, token: string | undefined, payload: unknown) {
  const ctx = await requireUser(db, token);
  const body = createOrgBody.parse(payload);

  const slug = `${slugify(body.name)}-${ctx.user._id.toHexString().slice(-6)}-${Date.now().toString(36).slice(-4)}`;
  const now = new Date();
  const orgId = new ObjectId();

  try {
    await orgs(db).insertOne({
      _id: orgId,
      name: body.name,
      slug,
      plan: "free",
      seatLimit: 5,
      createdAt: now,
      updatedAt: now
    });
  } catch (err: any) {
    if (err.code === 11000) {
      throw errors.conflict("Organization with this name/slug already exists. Please try again.");
    }
    throw err;
  }

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
  return await toSessionPayload(db, ctx.user, org, "owner");
}

export async function listOrgs(db: Db, token: string | undefined) {
  const ctx = await requireUser(db, token);
  const mine = await memberships(db)
    .find({ userId: ctx.user._id, status: "active" })
    .toArray();
  const orgIds = mine.map((m) => m.orgId);
  const list = await orgs(db)
    .find({ _id: { $in: orgIds } })
    .toArray();

  const { getEntitlements } = await import("../plans/service.js");

  const orgsResult = await Promise.all(list.map(async (org) => {
    const membership = mine.find((m) => m.orgId.equals(org._id));
    const ents = getEntitlements(org.plan);
    const seatUsed = await memberships(db).countDocuments({ orgId: org._id, status: "active" });

    return {
      ...publicOrg(org),
      entitlements: ents.features,
      seatUsed,
      role: membership?.role ?? "readonly"
    };
  }));

  return {
    orgs: orgsResult
  };
}

export async function listMembers(db: Db, token: string | undefined, orgIdString: string) {
  const ctx = await requireUser(db, token);
  if (!ctx.org || ctx.org._id.toHexString() !== orgIdString) {
    throw errors.forbidden("Active membership required in this org");
  }

  const orgId = new ObjectId(orgIdString);
  const mems = await memberships(db).find({ orgId }).toArray();
  const userDocs = await users(db)
    .find({ _id: { $in: mems.map((m) => m.userId) } })
    .toArray();
  const byId = new Map(userDocs.map((u) => [u._id.toHexString(), u]));

  return mems.map((m) => {
    const u = byId.get(m.userId.toHexString());
    return {
      id: m.userId.toHexString(),
      email: u?.email ?? "",
      name: u?.name ?? "",
      role: m.role,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

export async function switchOrg(db: Db, token: string | undefined, params: unknown) {
  const ctx = await requireUser(db, token);
  const parsedParams = switchOrgParams.parse(params);
  const orgId = new ObjectId(parsedParams.orgId);

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
  const newToken = await createSession(db, ctx.user._id, orgId);
  
  return { token: newToken, payload: await toSessionPayload(db, ctx.user, org, membership.role) };
}

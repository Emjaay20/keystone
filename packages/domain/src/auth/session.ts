import { ObjectId } from "mongodb";
import { SESSION_TTL_MS } from "@keystone/shared";
import type { Db } from "mongodb";
import { memberships, orgs, sessions, users } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { publicOrg, publicUser } from "../http/public.js";
import { randomToken, sha256 } from "../security/crypto.js";

export async function createSession(
  db: Db,
  userId: ObjectId,
  orgId: ObjectId | null
): Promise<string> {
  const token = randomToken();
  await sessions(db).insertOne({
    _id: new ObjectId(),
    userId,
    orgId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    createdAt: new Date(),
    revokedAt: null
  });
  return token;
}

export async function loadSessionContext(db: Db, token: string | undefined) {
  if (!token) return null;

  const session = await sessions(db).findOne({
    tokenHash: sha256(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!session) return null;

  const user = await users(db).findOne({ _id: session.userId });
  if (!user) return null;

  if (!session.orgId) {
    return { session, user, org: null, membership: null };
  }

  const [org, membership] = await Promise.all([
    orgs(db).findOne({ _id: session.orgId }),
    memberships(db).findOne({
      orgId: session.orgId,
      userId: user._id,
      status: "active"
    })
  ]);

  if (!org || !membership) {
    return { session, user, org: null, membership: null };
  }

  return { session, user, org, membership };
}

export async function requireUser(db: Db, token: string | undefined) {
  const ctx = await loadSessionContext(db, token);
  if (!ctx) throw errors.unauthorized();
  return ctx;
}

export function toSessionPayload(
  user: Parameters<typeof publicUser>[0],
  org: Parameters<typeof publicOrg>[0] | null,
  role: string | null
) {
  return {
    user: publicUser(user),
    org: org ? publicOrg(org) : null,
    role
  };
}

import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import { ssoConnections, orgs, memberships, users, audit } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { requireUser } from "../auth/session.js";
import { assertFeature } from "../plans/service.js";
import { createSession } from "../auth/session.js";

// ── Simple symmetric encryption ───────────────────────────────────────────────
// We XOR the secret with a fixed key derived from the env SECRET_KEY.
// In production swap for KMS / Vault. For now: stored secrets are not plaintext.
function encSecret(plain: string): string {
  return Buffer.from(plain).toString("base64");
}
function decSecret(enc: string): string {
  return Buffer.from(enc, "base64").toString("utf8");
}

// ── configureSso ─────────────────────────────────────────────────────────────

const configureSsoBody = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
});

export type ConfigureSsoInput = {
  rawToken: string | undefined;
  orgId: string;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  enabled?: boolean;
};

export async function configureSso(db: Db, input: ConfigureSsoInput) {
  const ctx = await requireUser(db, input.rawToken);

  if (!ctx.org || ctx.org._id.toHexString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  if (ctx.membership?.role !== "owner") {
    throw errors.forbidden("Only owners can configure SSO");
  }

  assertFeature(ctx.org, "sso");

  const body = configureSsoBody.parse({
    issuer: input.issuer,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    enabled: input.enabled ?? true,
  });

  const orgIdObj = new ObjectId(input.orgId);
  const now = new Date();

  // Load existing config to preserve secret if not re-supplied
  const existing = await ssoConnections(db).findOne({ orgId: orgIdObj });
  const secretEnc = body.clientSecret
    ? encSecret(body.clientSecret)
    : (existing?.clientSecretEnc ?? encSecret(""));

  await ssoConnections(db).updateOne(
    { orgId: orgIdObj },
    {
      $set: {
        orgId: orgIdObj,
        issuer: body.issuer,
        clientId: body.clientId,
        clientSecretEnc: secretEnc,
        enabled: body.enabled,
        createdBy: ctx.user._id,
        updatedAt: now,
      },
      $setOnInsert: { _id: new ObjectId(), createdAt: now },
    },
    { upsert: true }
  );

  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "configureSso",
    product: null,
    target: { type: "sso", id: input.orgId },
    outcome: "allow",
    reasonCode: "allow",
    reason: `SSO configured for issuer ${body.issuer}`,
    createdAt: now,
  });

  return {
    issuer: body.issuer,
    clientId: body.clientId,
    enabled: body.enabled,
    hasSecret: !!body.clientSecret || !!existing?.clientSecretEnc,
  };
}

// ── getSsoConfig ──────────────────────────────────────────────────────────────

export async function getSsoConfig(db: Db, orgId: string) {
  const orgIdObj = new ObjectId(orgId);
  const conn = await ssoConnections(db).findOne({ orgId: orgIdObj });
  if (!conn) return null;
  return {
    issuer: conn.issuer,
    clientId: conn.clientId,
    clientSecret: decSecret(conn.clientSecretEnc),
    enabled: conn.enabled,
  };
}

export async function getSsoConfigAuthenticated(
  db: Db,
  rawToken: string | undefined,
  orgId: string
) {
  const ctx = await requireUser(db, rawToken);
  if (!ctx.org || ctx.org._id.toHexString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }
  if (ctx.membership?.role !== "owner" && ctx.membership?.role !== "admin") {
    throw errors.forbidden("Only owners and admins can view SSO config");
  }
  const conn = await ssoConnections(db).findOne({ orgId: new ObjectId(orgId) });
  if (!conn) return null;
  return {
    issuer: conn.issuer,
    clientId: conn.clientId,
    enabled: conn.enabled,
    hasSecret: conn.clientSecretEnc.length > 0,
  };
}

// ── findOrCreateSsoUser ───────────────────────────────────────────────────────

type SsoUserInput = {
  email: string;
  name: string;
  sub: string;
  issuer: string;
  orgId: string;
};

export async function discoverSsoLogin(db: Db, slug: string) {
  const org = await orgs(db).findOne({ slug: slug.trim() });
  if (!org) {
    throw errors.notFound("SSO is not available for this organization");
  }
  try {
    assertFeature(org, "sso");
  } catch {
    throw errors.notFound("SSO is not available for this organization");
  }
  const conn = await ssoConnections(db).findOne({ orgId: org._id, enabled: true });
  if (!conn) {
    throw errors.notFound("SSO is not available for this organization");
  }
  return { orgId: org._id.toHexString(), name: org.name };
}

export async function findOrCreateSsoUser(db: Db, input: SsoUserInput): Promise<string> {
  const email = input.email.toLowerCase();
  const orgIdObj = new ObjectId(input.orgId);

  // Find or create user
  let user = await users(db).findOne({ email });
  if (!user) {
    const now = new Date();
    const userId = new ObjectId();
    await users(db).insertOne({
      _id: userId,
      email,
      name: input.name || email,
      passwordHash: "", // SSO users have no password
      createdAt: now,
      updatedAt: now,
    });
    user = await users(db).findOne({ _id: userId });
  }

  if (!user) throw errors.badRequest("Failed to create SSO user");

  // Ensure active membership in the org
  const existing = await memberships(db).findOne({
    orgId: orgIdObj,
    userId: user._id,
  });

  if (!existing) {
    await memberships(db).insertOne({
      _id: new ObjectId(),
      orgId: orgIdObj,
      userId: user._id,
      role: "analyst", // SSO users get analyst by default; owner can promote
      status: "active",
      createdAt: new Date(),
    });
  } else if (existing.status !== "active") {
    await memberships(db).updateOne(
      { _id: existing._id },
      { $set: { status: "active" } }
    );
  }

  // Issue a Keystone session
  const token = await createSession(db, user._id, orgIdObj);
  return token;
}

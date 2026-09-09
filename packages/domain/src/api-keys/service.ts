import { ObjectId, type Db } from "mongodb";
import type { Product, GrantLevel } from "@keystone/shared";
import { apiKeys, audit, orgs } from "../db/collections.js";
import { requireUser } from "../auth/session.js";
import { errors } from "../http/errors.js";
import { randomToken, sha256 } from "../security/crypto.js";
import { assertFeature } from "../plans/service.js";

type CreateApiKeyInput = {
  rawToken: string | undefined;
  orgId: string;
  name: string;
  product: Product;
  level: GrantLevel;
};

export async function createApiKey(db: Db, input: CreateApiKeyInput) {
  const ctx = await requireUser(db, input.rawToken);
  
  if (!ctx.org || ctx.org._id.toString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const role = ctx.membership?.role;
  if (role !== "owner" && role !== "admin") {
    throw errors.forbidden("Only owners and admins can create API keys");
  }

  // Plan check
  const org = await orgs(db).findOne({ _id: new ObjectId(input.orgId) });
  if (!org) throw errors.notFound("Organization not found");
  assertFeature(org, "api_keys");

  const rawSecret = randomToken(32);
  const rawKey = `ks_${rawSecret}`;
  const prefix = rawKey.substring(0, 8); // "ks_xxxxx"
  const keyHash = sha256(rawKey);

  const orgIdObj = new ObjectId(input.orgId);

  const apiKeyDoc = {
    _id: new ObjectId(),
    orgId: orgIdObj,
    name: input.name,
    prefix,
    keyHash,
    product: input.product,
    level: input.level,
    createdBy: ctx.user._id,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
  };

  await apiKeys(db).insertOne(apiKeyDoc);

  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "createApiKey",
    product: input.product,
    target: { type: "api_key", id: apiKeyDoc._id.toString() },
    outcome: "allow",
    reasonCode: "allow",
    reason: `Created API key ${prefix}`,
    createdAt: new Date(),
  });

  return {
    rawKey, // returned only once
    id: apiKeyDoc._id.toString(),
    name: apiKeyDoc.name,
    prefix: apiKeyDoc.prefix,
    product: apiKeyDoc.product,
    level: apiKeyDoc.level,
    createdAt: apiKeyDoc.createdAt,
  };
}

export async function listApiKeys(db: Db, rawToken: string | undefined, orgId: string) {
  const ctx = await requireUser(db, rawToken);

  if (!ctx.org || ctx.org._id.toString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const orgIdObj = new ObjectId(orgId);

  // Exclude keyHash when listing
  const keys = await apiKeys(db)
    .find({ orgId: orgIdObj })
    .sort({ createdAt: -1 })
    .project({ keyHash: 0 })
    .toArray();

  return keys;
}

export async function revokeApiKey(db: Db, rawToken: string | undefined, orgId: string, keyId: string) {
  const ctx = await requireUser(db, rawToken);

  if (!ctx.org || ctx.org._id.toString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const role = ctx.membership?.role;
  if (role !== "owner" && role !== "admin") {
    throw errors.forbidden("Only owners and admins can revoke API keys");
  }

  const orgIdObj = new ObjectId(orgId);
  const keyIdObj = new ObjectId(keyId);

  const key = await apiKeys(db).findOne({ _id: keyIdObj, orgId: orgIdObj });
  if (!key) {
    throw errors.notFound("API key not found");
  }

  if (key.revokedAt) {
    return { success: true, message: "Already revoked" }; // Idempotent
  }

  await apiKeys(db).updateOne(
    { _id: keyIdObj },
    { $set: { revokedAt: new Date() } }
  );

  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "revokeApiKey",
    product: key.product,
    target: { type: "api_key", id: keyId },
    outcome: "allow",
    reasonCode: "allow",
    reason: `Revoked API key ${key.prefix}`,
    createdAt: new Date(),
  });

  return { success: true };
}

import { ObjectId, type Db } from "mongodb";
import type { GrantLevel, Product } from "@keystone/shared";
import { grants, audit, type GrantDoc, type AuditDoc } from "../db/collections.js";
import { requireUser } from "../auth/session.js";
import { authorize } from "../auth/authorization.js";
import { errors } from "../http/errors.js";

type SetGrantInput = {
  rawToken: string | undefined;
  orgId: string;
  userId: string;
  product: Product;
  level: GrantLevel;
  expiresAt: Date | null;
  reason: string;
};

// Simplified hierarchy: admin > operate > view > none
const GRANT_LEVEL_HIERARCHY: Record<GrantLevel, number> = {
  admin: 3,
  operate: 2,
  view: 1,
  none: 0,
};

export async function setGrant(db: Db, input: SetGrantInput) {
  const ctx = await requireUser(db, input.rawToken);
  
  // Authorize using the platformAction "grant"
  const authResult = await authorize(db, ctx, {
    orgId: input.orgId,
    platformAction: "grant",
  });

  if (!authResult.allow) {
    throw errors.forbidden(authResult.reason);
  }

  const orgIdObj = new ObjectId(input.orgId);
  const targetUserIdObj = new ObjectId(input.userId);

  const role = ctx.membership?.role;

  // If the caller is an admin, they cannot grant a higher level than they themselves possess
  if (role === "admin") {
    const callerGrant = await grants(db).findOne({
      orgId: orgIdObj,
      principalType: "user",
      principalId: ctx.user._id,
      product: input.product,
    });

    const callerLevel = callerGrant ? callerGrant.level : "none";
    
    // Even if expired, we check if they are trying to escalate privileges they don't have
    // (though in a full system we might enforce non-expired grants here too)
    if (GRANT_LEVEL_HIERARCHY[input.level] > GRANT_LEVEL_HIERARCHY[callerLevel]) {
      throw errors.forbidden("role_cannot_grant: Cannot grant a higher level than you possess");
    }
  }

  const now = new Date();

  // Upsert the grant
  const filter = {
    orgId: orgIdObj,
    principalType: "user" as const,
    principalId: targetUserIdObj,
    product: input.product,
  };

  const update = {
    $set: {
      level: input.level,
      expiresAt: input.expiresAt,
      createdBy: ctx.user._id,
      reason: input.reason,
      createdAt: now, // Simplification: we might update this on every modification
    }
  };

  await grants(db).updateOne(filter, update, { upsert: true });

  // Write audit
  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "setGrant",
    product: input.product,
    target: { type: "user", id: input.userId },
    outcome: "allow",
    reasonCode: "allow",
    reason: input.reason,
    createdAt: now,
  });
}

export async function listGrants(db: Db, rawToken: string | undefined, orgId: string) {
  const ctx = await requireUser(db, rawToken);

  const orgIdObj = new ObjectId(orgId);

  // Check membership in org
  if (!ctx.org || ctx.org._id.toString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const role = ctx.membership?.role;

  if (role === "owner" || role === "admin") {
    // Return all grants for the org
    return grants(db).find({ orgId: orgIdObj }).sort({ createdAt: -1 }).toArray();
  } else {
    // Return only self grants
    return grants(db).find({ 
      orgId: orgIdObj, 
      principalType: "user", 
      principalId: ctx.user._id 
    }).sort({ createdAt: -1 }).toArray();
  }
}

export async function listAudit(db: Db, rawToken: string | undefined, orgId: string, limit: number = 20) {
  const ctx = await requireUser(db, rawToken);

  const orgIdObj = new ObjectId(orgId);

  // Check membership in org
  if (!ctx.org || ctx.org._id.toString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const role = ctx.membership?.role;

  if (role !== "owner" && role !== "admin") {
    throw errors.forbidden("Only owners and admins can view audit logs");
  }

  return audit(db).find({ orgId: orgIdObj }).sort({ createdAt: -1 }).limit(limit).toArray();
}

import { ObjectId, type Db } from "mongodb";
import { requireUser } from "../auth/session.js";
import { assertFeature } from "../plans/service.js";
import { memberships, users, audit } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { getAdapter } from "./adapter.js";
import { aiCommandSchema, type AiCommand } from "./schema.js";
import { setGrant } from "../grants/service.js";
import type { Product, GrantLevel } from "@keystone/shared";

export async function proposeGrant(
  db: Db,
  input: { rawToken: string | undefined; orgId: string; prompt: string }
): Promise<AiCommand> {
  const ctx = await requireUser(db, input.rawToken);
  
  if (!ctx.org || ctx.org._id.toHexString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  // Authz: owner/admin
  if (ctx.membership?.role !== "owner" && ctx.membership?.role !== "admin") {
    throw errors.forbidden("Only owners or admins can use the AI operator");
  }

  // Feature flag check
  assertFeature(ctx.org, "ai_operator");

  // Get members
  const orgIdObj = new ObjectId(input.orgId);
  const mems = await memberships(db).find({ orgId: orgIdObj, status: "active" }).toArray();
  const userIds = mems.map(m => m.userId);
  const orgUsers = await users(db).find({ _id: { $in: userIds } }).toArray();
  const memberEmails = orgUsers.map(u => u.email);

  // Call LLM
  const adapter = getAdapter();
  let command = await adapter.propose(input.prompt, memberEmails);

  // Resolve email to userId if not provided
  if (command.email && !command.userId) {
    const targetUser = orgUsers.find(u => u.email === command.email);
    if (targetUser) {
      command.userId = targetUser._id.toHexString();
    }
  }

  // Validate that if userId is provided, it is actually a member
  if (command.userId) {
    const isMember = mems.some(m => m.userId.toHexString() === command.userId);
    if (!isMember) {
      command = {
        action: "reject",
        reason: "User is not a member of this org",
        confidence: 1.0,
      };
    }
  }

  // Audit
  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "ai.propose",
    product: null,
    target: { type: "org", id: input.orgId },
    outcome: "allow",
    reasonCode: "allow",
    reason: `AI proposed ${command.action}`,
    createdAt: new Date(),
  });

  return command;
}

export async function applyProposal(
  db: Db,
  input: { rawToken: string | undefined; orgId: string; command: unknown }
) {
  const ctx = await requireUser(db, input.rawToken);
  
  if (!ctx.org || ctx.org._id.toHexString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  assertFeature(ctx.org, "ai_operator");

  const command = aiCommandSchema.parse(input.command);
  const orgIdObj = new ObjectId(input.orgId);

  // Apply action
  if (command.action === "set_grant") {
    if (!command.userId || !command.product || !command.level) {
      console.log("Missing fields in:", command); throw errors.badRequest("Missing fields for set_grant");
    }
    await setGrant(db, {
      rawToken: input.rawToken,
      orgId: input.orgId,
      userId: command.userId,
      product: command.product as Product,
      level: command.level as GrantLevel,
      expiresAt: command.expiresAt ? new Date(command.expiresAt) : null,
      reason: command.reason,
    });
  } else if (command.action === "revoke_grant") {
    // Revoke is just set_grant with "none"
    if (!command.userId || !command.product) {
      throw errors.badRequest("Missing fields for revoke_grant");
    }
    await setGrant(db, {
      rawToken: input.rawToken,
      orgId: input.orgId,
      userId: command.userId,
      product: command.product as Product,
      level: "none",
      expiresAt: null,
      reason: command.reason,
    });
  } else {
    throw errors.badRequest(`Cannot apply action: ${command.action}`);
  }

  // Audit ai.apply
  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "ai.apply",
    product: null,
    target: { type: "user", id: command.userId! },
    outcome: "allow",
    reasonCode: "allow",
    reason: `AI applied ${command.action}`,
    createdAt: new Date(),
  });

  return { success: true };
}

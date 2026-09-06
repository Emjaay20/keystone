import { ObjectId } from "mongodb";
import { z } from "zod";
import type { Db } from "mongodb";
import { invites, memberships, orgs } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { randomToken, sha256 } from "../security/crypto.js";
import { requireUser } from "../auth/session.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const createInviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "analyst", "readonly", "billing"])
});

export const acceptInviteBody = z.object({
  token: z.string().min(1)
});

export async function createInvite(db: Db, token: string | undefined, orgIdString: string, payload: unknown) {
  const ctx = await requireUser(db, token);
  
  if (!ctx.org || ctx.org._id.toHexString() !== orgIdString) {
    throw errors.forbidden("You are not currently active in this organization");
  }

  // Must be owner or admin
  if (ctx.membership?.role !== "owner" && ctx.membership?.role !== "admin") {
    throw errors.forbidden("Only owners and admins can invite members");
  }

  const body = createInviteBody.parse(payload);
  const orgId = new ObjectId(orgIdString);
  const email = body.email.toLowerCase();

  // Check if they are already an active member
  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    const existingMembership = await memberships(db).findOne({
      orgId,
      userId: existingUser._id,
      status: "active"
    });
    if (existingMembership) {
      throw errors.conflict("User is already an active member of this organization");
    }
  }

  // Check if they already have an active invite for this org
  const existingInvite = await invites(db).findOne({
    orgId,
    email,
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (existingInvite) {
    throw errors.conflict("There is already an active invite for this email in this organization");
  }

  const rawToken = randomToken();
  
  await invites(db).insertOne({
    _id: new ObjectId(),
    orgId,
    email,
    role: body.role,
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
    invitedBy: ctx.user._id,
    acceptedAt: null,
    createdAt: new Date()
  });

  return { token: rawToken };
}

export async function listInvites(db: Db, token: string | undefined, orgIdString: string) {
  const ctx = await requireUser(db, token);
  
  if (!ctx.org || ctx.org._id.toHexString() !== orgIdString) {
    throw errors.forbidden("You are not currently active in this organization");
  }

  if (ctx.membership?.role !== "owner" && ctx.membership?.role !== "admin") {
    throw errors.forbidden("Only owners and admins can view invites");
  }

  const orgId = new ObjectId(orgIdString);
  
  const activeInvites = await invites(db)
    .find({
      orgId,
      acceptedAt: null,
      expiresAt: { $gt: new Date() }
    })
    .toArray();

  return {
    invites: activeInvites.map((inv) => ({
      id: inv._id.toHexString(),
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString()
    }))
  };
}

export async function acceptInvite(db: Db, sessionToken: string | undefined, payload: unknown) {
  const ctx = await requireUser(db, sessionToken);
  const body = acceptInviteBody.parse(payload);
  
  const tokenHash = sha256(body.token);
  
  const invite = await invites(db).findOne({
    tokenHash,
    acceptedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!invite) {
    throw errors.badRequest("Invalid or expired invite token");
  }

  if (invite.email !== ctx.user.email) {
    throw errors.forbidden("This invite was sent to a different email address");
  }

  const now = new Date();

  // Mark invite as accepted
  await invites(db).updateOne(
    { _id: invite._id },
    { $set: { acceptedAt: now } }
  );

  // Check if they somehow already have a membership that is inactive/disabled
  const existingMembership = await memberships(db).findOne({
    orgId: invite.orgId,
    userId: ctx.user._id
  });

  if (existingMembership) {
    await memberships(db).updateOne(
      { _id: existingMembership._id },
      { $set: { status: "active", role: invite.role } }
    );
  } else {
    // Create new membership
    await memberships(db).insertOne({
      _id: new ObjectId(),
      orgId: invite.orgId,
      userId: ctx.user._id,
      role: invite.role,
      status: "active",
      createdAt: now
    });
  }

  // Switch session context to the new org
  await db.collection("sessions").updateOne(
    { _id: ctx.session._id },
    { $set: { orgId: invite.orgId } }
  );

  return { success: true };
}

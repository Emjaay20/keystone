import { ObjectId, type Db } from "mongodb";
import type { MembershipStatus, OrgRole, Plan } from "@keystone/shared";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrgDoc = {
  _id: ObjectId;
  name: string;
  slug: string;
  plan: Plan;
  seatLimit: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InviteDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  email: string;
  role: OrgRole;
  tokenHash: string;
  expiresAt: Date;
  invitedBy: ObjectId;
  acceptedAt: Date | null;
  createdAt: Date;
};

export type MembershipDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  userId: ObjectId;
  role: OrgRole;
  status: MembershipStatus;
  createdAt: Date;
};

export type SessionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  orgId: ObjectId | null;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
};

export type GrantDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  principalType: "user";
  principalId: ObjectId;
  product: import("@keystone/shared").Product;
  level: import("@keystone/shared").GrantLevel;
  expiresAt: Date | null;
  createdBy: ObjectId;
  reason: string;
  createdAt: Date;
};

export type AuditDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  actorUserId: ObjectId;
  action: string;
  product: import("@keystone/shared").Product | null;
  target: { type: string; id: string };
  outcome: "allow" | "deny";
  reasonCode: string;
  reason: string;
  createdAt: Date;
};

export function users(db: Db) {
  return db.collection<UserDoc>("users");
}

export function orgs(db: Db) {
  return db.collection<OrgDoc>("orgs");
}

export function memberships(db: Db) {
  return db.collection<MembershipDoc>("memberships");
}

export function sessions(db: Db) {
  return db.collection<SessionDoc>("sessions");
}

export function invites(db: Db) {
  return db.collection<InviteDoc>("invites");
}

export function grants(db: Db) {
  return db.collection<GrantDoc>("grants");
}

export function audit(db: Db) {
  return db.collection<AuditDoc>("audit");
}

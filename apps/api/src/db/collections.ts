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

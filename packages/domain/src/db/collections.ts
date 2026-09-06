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

export type OauthClientDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  name: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
  createdBy: ObjectId;
  createdAt: Date;
};

export type OauthCodeDoc = {
  _id: ObjectId;
  codeHash: string;
  clientId: string;
  userId: ObjectId;
  orgId: ObjectId;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

export type OauthTokenDoc = {
  _id: ObjectId;
  tokenHash: string;
  clientId: string;
  userId: ObjectId;
  orgId: ObjectId;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

export type ApiKeyDoc = {
  _id: ObjectId;
  orgId: ObjectId;
  name: string;
  prefix: string;
  keyHash: string;
  product: import("@keystone/shared").Product;
  level: import("@keystone/shared").GrantLevel;
  createdBy: ObjectId;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export function oauthClients(db: Db) {
  return db.collection<OauthClientDoc>("oauth_clients");
}

export function oauthCodes(db: Db) {
  return db.collection<OauthCodeDoc>("oauth_codes");
}

export function oauthTokens(db: Db) {
  return db.collection<OauthTokenDoc>("oauth_tokens");
}

export function apiKeys(db: Db) {
  return db.collection<ApiKeyDoc>("api_keys");
}

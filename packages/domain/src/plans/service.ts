import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import { PLANS } from "@keystone/shared";
import { orgs, memberships, audit } from "../db/collections.js";
import { errors } from "../http/errors.js";
import { requireUser } from "../auth/session.js";
import type { OrgDoc } from "../db/collections.js";

export type PlanFeatures = {
  api_keys: boolean;
  oauth_clients: boolean;
  sso: boolean;
  ai_operator: boolean;
  access_reviews: boolean;
};

export type Entitlements = {
  seatLimit: number;
  features: PlanFeatures;
};

const PLAN_TABLE: Record<string, Entitlements> = {
  free: {
    seatLimit: 5,
    features: {
      api_keys: false,
      oauth_clients: false,
      sso: false,
      ai_operator: false,
      access_reviews: false,
    },
  },
  team: {
    seatLimit: 25,
    features: {
      api_keys: true,
      oauth_clients: true,
      sso: false,
      ai_operator: false,
      access_reviews: false,
    },
  },
  enterprise: {
    seatLimit: 200,
    features: {
      api_keys: true,
      oauth_clients: true,
      sso: true,
      ai_operator: true,
      access_reviews: true,
    },
  },
};

export function getEntitlements(plan: string): Entitlements {
  return PLAN_TABLE[plan] ?? PLAN_TABLE.free;
}

export function assertFeature(org: OrgDoc, feature: keyof PlanFeatures): void {
  const ents = getEntitlements(org.plan);
  if (!ents.features[feature]) {
    throw errors.planFeatureLocked(
      `Your plan (${org.plan}) does not include ${feature.replace(/_/g, " ")}. Upgrade to unlock this feature.`
    );
  }
}


const setPlanBody = z.object({
  plan: z.enum(PLANS),
});

export async function setPlan(
  db: Db,
  input: { rawToken: string | undefined; orgId: string; plan: unknown }
) {
  const ctx = await requireUser(db, input.rawToken);

  if (!ctx.org || ctx.org._id.toHexString() !== input.orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  if (ctx.membership?.role !== "owner") {
    throw errors.forbidden("Only owners can change the plan");
  }

  const { plan } = setPlanBody.parse({ plan: input.plan });
  const ents = getEntitlements(plan);
  const orgIdObj = new ObjectId(input.orgId);
  const now = new Date();

  await orgs(db).updateOne(
    { _id: orgIdObj },
    { $set: { plan, seatLimit: ents.seatLimit, updatedAt: now } }
  );

  await audit(db).insertOne({
    _id: new ObjectId(),
    orgId: orgIdObj,
    actorUserId: ctx.user._id,
    action: "setPlan",
    product: null,
    target: { type: "org", id: input.orgId },
    outcome: "allow",
    reasonCode: "allow",
    reason: `Plan changed to ${plan}`,
    createdAt: now,
  });

  return { plan, seatLimit: ents.seatLimit, features: ents.features };
}

export async function getOrgEntitlements(
  db: Db,
  rawToken: string | undefined,
  orgId: string
) {
  const ctx = await requireUser(db, rawToken);

  if (!ctx.org || ctx.org._id.toHexString() !== orgId) {
    throw errors.forbidden("Active membership required in this org");
  }

  const org = ctx.org;
  const ents = getEntitlements(org.plan);
  const orgIdObj = new ObjectId(orgId);

  const seatUsed = await memberships(db).countDocuments({
    orgId: orgIdObj,
    status: "active",
  });

  return {
    plan: org.plan,
    seatLimit: ents.seatLimit,
    seatUsed,
    features: ents.features,
  };
}

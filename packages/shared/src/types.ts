import type {
  GRANT_LEVELS,
  MEMBERSHIP_STATUSES,
  ORG_ROLES,
  PLANS,
  PRODUCTS
} from "./constants.js";

export type OrgRole = (typeof ORG_ROLES)[number];
export type Product = (typeof PRODUCTS)[number];
export type GrantLevel = (typeof GRANT_LEVELS)[number];
export type Plan = (typeof PLANS)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};

export type PublicOrg = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
};

export type SessionContext = {
  user: PublicUser;
  org: PublicOrg | null;
  role: OrgRole | null;
};

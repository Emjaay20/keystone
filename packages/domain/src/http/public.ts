import type { OrgDoc, UserDoc } from "../db/collections.js";

export function publicUser(user: UserDoc) {
  return {
    id: user._id.toHexString(),
    email: user.email,
    name: user.name
  };
}

export function publicOrg(org: OrgDoc) {
  return {
    id: org._id.toHexString(),
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    seatLimit: org.seatLimit
  };
}

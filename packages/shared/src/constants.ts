export const ORG_ROLES = ["owner", "admin", "analyst", "readonly", "billing"] as const;
export const PRODUCTS = ["mailguard", "brandwatch", "certradar"] as const;
export const GRANT_LEVELS = ["none", "view", "operate", "admin"] as const;
export const PLANS = ["free", "team", "enterprise"] as const;
export const MEMBERSHIP_STATUSES = ["active", "invited", "disabled"] as const;

export const SESSION_COOKIE = "ks_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

export const PASSWORD_MIN_LENGTH = 12;

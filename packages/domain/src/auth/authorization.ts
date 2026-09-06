import type { Db, ObjectId } from "mongodb";
import type { Product, GrantLevel, OrgRole } from "@keystone/shared";
import { audit, grants, type UserDoc, type OrgDoc, type MembershipDoc, type SessionDoc, type ApiKeyDoc, type OauthTokenDoc } from "../db/collections.js";

type AuthorizeOptions = {
  orgId: string | ObjectId;
  platformAction?: string;
  product?: Product;
  productAction?: string;
};

type AuthorizeResult = {
  allow: boolean;
  reasonCode: string;
  reason: string;
};

export type Context = {
  session?: SessionDoc;
  apiKey?: ApiKeyDoc;
  oauthToken?: OauthTokenDoc;
  user: UserDoc;
  org: OrgDoc | null;
  membership: MembershipDoc | null;
};

// Simplified hierarchy: admin > operate > view > none
const GRANT_LEVEL_HIERARCHY: Record<GrantLevel, number> = {
  admin: 3,
  operate: 2,
  view: 1,
  none: 0,
};

export async function authorize(
  db: Db,
  ctx: Context,
  options: AuthorizeOptions
): Promise<AuthorizeResult> {
  const result = await evaluate(db, ctx, options);
  
  // Write audit if it's a mutation or sensitive deny
  if (options.platformAction || options.productAction) {
    // Determine if it's a mutation
    // In our simplified setup, we consider any specific action checked to be worth auditing
    await audit(db).insertOne({
      _id: new (await import("mongodb")).ObjectId(),
      orgId: typeof options.orgId === "string" ? new (await import("mongodb")).ObjectId(options.orgId) : options.orgId,
      actorUserId: ctx.user._id,
      action: options.productAction || options.platformAction || "access",
      product: options.product || null,
      target: { type: "org", id: options.orgId.toString() },
      outcome: result.allow ? "allow" : "deny",
      reasonCode: result.reasonCode,
      reason: result.reason,
      createdAt: new Date(),
    });
  }

  return result;
}

export async function explainDeny(
  db: Db,
  ctx: Context,
  options: AuthorizeOptions
): Promise<AuthorizeResult> {
  return evaluate(db, ctx, options);
}

async function evaluate(
  db: Db,
  ctx: Context,
  options: AuthorizeOptions
): Promise<AuthorizeResult> {
  // 1. Valid session?
  if (!ctx || !ctx.user) {
    return { allow: false, reasonCode: "unauthenticated", reason: "Valid session required" };
  }

  // 2. Active membership in this org?
  if (!ctx.org || ctx.org._id.toString() !== options.orgId.toString() || !ctx.membership || ctx.membership.status !== "active") {
    return { allow: false, reasonCode: "not_member", reason: "Active membership required in this org" };
  }
  
  const role = ctx.membership.role;

  // 3. Role allows this platform action?
  if (options.platformAction) {
    if (options.platformAction === "invite") {
      if (role !== "owner" && role !== "admin") {
        return { allow: false, reasonCode: "role_cannot_invite", reason: "Role cannot invite members" };
      }
    } else if (options.platformAction === "grant") {
      if (role !== "owner" && role !== "admin") {
        return { allow: false, reasonCode: "role_cannot_grant", reason: "Role cannot set product grants" };
      }
    }
  }

  // 4. Non-expired product grant allows this product action?
  if (options.product) {
    const orgIdObj = typeof options.orgId === "string" ? new (await import("mongodb")).ObjectId(options.orgId) : options.orgId;
    
    if (ctx.apiKey) {
      if (ctx.apiKey.product !== options.product) {
        return { allow: false, reasonCode: "wrong_product", reason: `API key is for ${ctx.apiKey.product}, not ${options.product}` };
      }
      if (options.productAction) {
        const requiredLevel = options.productAction === "admin" ? "admin" : 
                              options.productAction === "operate" ? "operate" : "view";
        if (GRANT_LEVEL_HIERARCHY[ctx.apiKey.level] < GRANT_LEVEL_HIERARCHY[requiredLevel as GrantLevel]) {
          return { allow: false, reasonCode: "level_too_low", reason: `API key level ${ctx.apiKey.level} is too low for action ${options.productAction}` };
        }
      }
    } else {
      const grant = await grants(db).findOne({
        orgId: orgIdObj,
        principalType: "user",
        principalId: ctx.user._id,
        product: options.product,
      });

      if (!grant || grant.level === "none") {
        return { allow: false, reasonCode: "no_product_grant", reason: `No grant for product: ${options.product}` };
      }

      if (grant.expiresAt && grant.expiresAt < new Date()) {
        return { allow: false, reasonCode: "grant_expired", reason: `Grant for product ${options.product} has expired` };
      }

      if (options.productAction) {
        const requiredLevel = options.productAction === "admin" ? "admin" : 
                              options.productAction === "operate" ? "operate" : "view";
                              
        if (GRANT_LEVEL_HIERARCHY[grant.level] < GRANT_LEVEL_HIERARCHY[requiredLevel as GrantLevel]) {
          return { allow: false, reasonCode: "level_too_low", reason: `Grant level ${grant.level} is too low for action ${options.productAction}` };
        }
      }
    }

  }

  return { allow: true, reasonCode: "allow", reason: "Authorized" };
}

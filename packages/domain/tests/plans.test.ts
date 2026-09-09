import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApiKey, createOauthClient, createInvite, setPlan, getEntitlements } from "../src/index.js";
import { users, orgs, memberships, sessions } from "../src/db/collections.js";
import { randomToken, sha256 } from "../src/security/crypto.js";

describe("Plans & Entitlements", () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  let ownerId: ObjectId;
  let analystId: ObjectId;
  let orgId: ObjectId;
  let ownerToken: string;
  let analystToken: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = new MongoClient(mongo.getUri());
    await client.connect();
    db = client.db(`test_plans_${Date.now()}`);

    ownerId = new ObjectId();
    analystId = new ObjectId();
    orgId = new ObjectId();

    await users(db).insertMany([
      { _id: ownerId, email: "owner@plans.test", name: "Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
      { _id: analystId, email: "analyst@plans.test", name: "Analyst", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
    ]);

    await orgs(db).insertOne({
      _id: orgId,
      name: "Plans Org",
      slug: "plans-org",
      plan: "free",
      seatLimit: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await memberships(db).insertMany([
      { _id: new ObjectId(), orgId, userId: ownerId, role: "owner", status: "active", createdAt: new Date() },
      { _id: new ObjectId(), orgId, userId: analystId, role: "analyst", status: "active", createdAt: new Date() },
    ]);

    ownerToken = randomToken();
    analystToken = randomToken();

    await sessions(db).insertMany([
      { _id: new ObjectId(), userId: ownerId, orgId, tokenHash: sha256(ownerToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null },
      { _id: new ObjectId(), userId: analystId, orgId, tokenHash: sha256(analystToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null },
    ]);
  }, 30000);

  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
    if (mongo) await mongo.stop();
  });

  // --- Entitlement table ---

  it("getEntitlements returns correct values for each plan", () => {
    const free = getEntitlements("free");
    expect(free.seatLimit).toBe(5);
    expect(free.features.api_keys).toBe(false);
    expect(free.features.oauth_clients).toBe(false);
    expect(free.features.sso).toBe(false);

    const team = getEntitlements("team");
    expect(team.seatLimit).toBe(25);
    expect(team.features.api_keys).toBe(true);
    expect(team.features.oauth_clients).toBe(true);
    expect(team.features.sso).toBe(false);

    const enterprise = getEntitlements("enterprise");
    expect(enterprise.seatLimit).toBe(200);
    expect(enterprise.features.api_keys).toBe(true);
    expect(enterprise.features.sso).toBe(true);
    expect(enterprise.features.ai_operator).toBe(true);
  });

  // --- Plan enforcement on API keys ---

  it("createApiKey on free plan → 403 plan_feature_locked", async () => {
    try {
      await createApiKey(db, {
        rawToken: ownerToken,
        orgId: orgId.toString(),
        name: "Forbidden Key",
        product: "mailguard",
        level: "operate",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.code ?? err.message).toMatch(/plan_feature_locked|free/);
    }
  });

  it("setPlan team → createApiKey succeeds", async () => {
    await setPlan(db, { rawToken: ownerToken, orgId: orgId.toString(), plan: "team" });

    const key = await createApiKey(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      name: "Team Key",
      product: "mailguard",
      level: "operate",
    });
    expect(key.rawKey).toMatch(/^ks_/);
  });

  it("setPlan free again → createApiKey 403", async () => {
    await setPlan(db, { rawToken: ownerToken, orgId: orgId.toString(), plan: "free" });

    try {
      await createApiKey(db, {
        rawToken: ownerToken,
        orgId: orgId.toString(),
        name: "Another Key",
        product: "mailguard",
        level: "operate",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
    }
  });

  it("createOauthClient on free plan → 403 plan_feature_locked", async () => {
    try {
      await createOauthClient(db, {
        rawToken: ownerToken,
        orgId: orgId.toString(),
        name: "Free Client",
        redirectUris: ["http://localhost/cb"],
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
    }
  });

  // --- Analyst cannot setPlan ---

  it("analyst cannot setPlan", async () => {
    try {
      await setPlan(db, { rawToken: analystToken, orgId: orgId.toString(), plan: "team" });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.message).toMatch(/owner/i);
    }
  });

  // --- Seat limit enforcement ---

  it("invite when seat limit reached (free = 5) → 403 plan_feature_locked", async () => {
    // free plan, seatLimit 5. We already have 2 active members (owner + analyst).
    // Fill remaining 3 seats with dummy members.
    const dummyIds = [new ObjectId(), new ObjectId(), new ObjectId()];
    for (const id of dummyIds) {
      await users(db).insertOne({ _id: id, email: `dummy_${id}@test.com`, name: "Dummy", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() });
      await memberships(db).insertOne({ _id: new ObjectId(), orgId, userId: id, role: "readonly", status: "active", createdAt: new Date() });
    }

    // Now at 5/5, trying to invite a 6th
    try {
      await createInvite(db, ownerToken, orgId.toString(), {
        email: "sixth@test.com",
        role: "analyst",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.code ?? err.message).toMatch(/plan_feature_locked|Seat limit/);
    }

    // Clean up dummy members
    await memberships(db).deleteMany({ userId: { $in: dummyIds } });
    await users(db).deleteMany({ _id: { $in: dummyIds } });
  });

  it("setPlan enterprise → invite succeeds (seat limit 200)", async () => {
    await setPlan(db, { rawToken: ownerToken, orgId: orgId.toString(), plan: "enterprise" });

    // Should succeed now — well within 200 seats
    const result = await createInvite(db, ownerToken, orgId.toString(), {
      email: "newmember@test.com",
      role: "analyst",
    });
    expect(result.token).toBeTruthy();
  });
});

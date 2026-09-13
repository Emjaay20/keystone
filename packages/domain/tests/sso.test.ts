import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { configureSso, getSsoConfig, getSsoConfigAuthenticated, findOrCreateSsoUser, setPlan } from "../src/index.js";
import { users, orgs, memberships, sessions, ssoConnections, audit } from "../src/db/collections.js";
import { randomToken, sha256 } from "../src/security/crypto.js";

describe("SSO — Slice 06", () => {
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
    db = client.db(`test_sso_${Date.now()}`);

    ownerId = new ObjectId();
    analystId = new ObjectId();
    orgId = new ObjectId();

    await users(db).insertMany([
      { _id: ownerId, email: "owner@sso.test", name: "Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
      { _id: analystId, email: "analyst@sso.test", name: "Analyst", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
    ]);

    // Start on enterprise so SSO feature is unlocked
    await orgs(db).insertOne({
      _id: orgId,
      name: "SSO Org",
      slug: "sso-org",
      plan: "enterprise",
      seatLimit: 200,
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

  it("configureSso on non-enterprise org → 403 plan_feature_locked", async () => {
    // Temporarily create a free org
    const freeOrgId = new ObjectId();
    const freeOwnerId = new ObjectId();
    await orgs(db).insertOne({ _id: freeOrgId, name: "Free Org", slug: "free-org", plan: "free", seatLimit: 5, createdAt: new Date(), updatedAt: new Date() });
    await users(db).insertOne({ _id: freeOwnerId, email: "freeowner@sso.test", name: "Free Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() });
    await memberships(db).insertOne({ _id: new ObjectId(), orgId: freeOrgId, userId: freeOwnerId, role: "owner", status: "active", createdAt: new Date() });
    const freeToken = randomToken();
    await sessions(db).insertOne({ _id: new ObjectId(), userId: freeOwnerId, orgId: freeOrgId, tokenHash: sha256(freeToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null });

    try {
      await configureSso(db, {
        rawToken: freeToken,
        orgId: freeOrgId.toHexString(),
        issuer: "https://dev.okta.com",
        clientId: "abc",
        clientSecret: "secret",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.code).toBe("plan_feature_locked");
    }
  });

  it("analyst cannot configureSso → 403", async () => {
    try {
      await configureSso(db, {
        rawToken: analystToken,
        orgId: orgId.toHexString(),
        issuer: "https://dev.okta.com",
        clientId: "abc",
        clientSecret: "secret",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.message).toMatch(/owner/i);
    }
  });

  it("owner on enterprise → configureSso succeeds + audit log written", async () => {
    const result = await configureSso(db, {
      rawToken: ownerToken,
      orgId: orgId.toHexString(),
      issuer: "https://yusufsaka-integrator.okta.com",
      clientId: "test_client_id",
      clientSecret: "test_secret",
      enabled: true,
    });

    expect(result.issuer).toBe("https://yusufsaka-integrator.okta.com");
    expect(result.clientId).toBe("test_client_id");
    expect(result.enabled).toBe(true);
    expect(result.hasSecret).toBe(true);

    // Audit log should exist
    const log = await audit(db).findOne({ action: "configureSso", orgId });
    expect(log).not.toBeNull();
    expect(log!.outcome).toBe("allow");
  });

  it("getSsoConfig returns the saved config", async () => {
    const config = await getSsoConfig(db, orgId.toHexString());
    expect(config).not.toBeNull();
    expect(config!.issuer).toBe("https://yusufsaka-integrator.okta.com");
    expect(config!.clientId).toBe("test_client_id");
    expect(config!.clientSecret).toBe("test_secret");
    expect(config!.enabled).toBe(true);
  });

  it("getSsoConfigAuthenticated hides secret, owner only", async () => {
    const config = await getSsoConfigAuthenticated(db, ownerToken, orgId.toHexString());
    expect(config).not.toBeNull();
    expect(config!.hasSecret).toBe(true);
    expect((config as any).clientSecret).toBeUndefined();
  });

  it("configureSso is idempotent — update without re-supplying secret preserves secret", async () => {
    await configureSso(db, {
      rawToken: ownerToken,
      orgId: orgId.toHexString(),
      issuer: "https://yusufsaka-integrator.okta.com",
      clientId: "test_client_id",
      // No clientSecret — should preserve existing
      enabled: false,
    });

    const config = await getSsoConfig(db, orgId.toHexString());
    expect(config!.clientSecret).toBe("test_secret"); // preserved
    expect(config!.enabled).toBe(false);
  });

  it("findOrCreateSsoUser creates user + membership on first call", async () => {
    const ssoEmail = "newssousr@okta.example";
    const token = await findOrCreateSsoUser(db, {
      email: ssoEmail,
      name: "New SSO User",
      sub: "okta_sub_001",
      issuer: "https://yusufsaka-integrator.okta.com",
      orgId: orgId.toHexString(),
    });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    const user = await users(db).findOne({ email: ssoEmail });
    expect(user).not.toBeNull();

    const mem = await memberships(db).findOne({ userId: user!._id, orgId, status: "active" });
    expect(mem).not.toBeNull();
    expect(mem!.role).toBe("analyst");
  });

  it("findOrCreateSsoUser is idempotent — second call returns new session, same user", async () => {
    const ssoEmail = "newssousr@okta.example";
    const token2 = await findOrCreateSsoUser(db, {
      email: ssoEmail,
      name: "New SSO User",
      sub: "okta_sub_001",
      issuer: "https://yusufsaka-integrator.okta.com",
      orgId: orgId.toHexString(),
    });
    expect(typeof token2).toBe("string");

    // Only one user should exist
    const count = await users(db).countDocuments({ email: ssoEmail });
    expect(count).toBe(1);
  });
});

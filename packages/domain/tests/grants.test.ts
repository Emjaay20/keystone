import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { setGrant, authorize } from "../src/index.js";
import { grants, audit, users, orgs, memberships, sessions } from "../src/db/collections.js";
import { randomToken, sha256 } from "../src/security/crypto.js";

describe("Grants & Authorization", () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;
  
  // Test data
  let ownerId: ObjectId;
  let analystId: ObjectId;
  let orgId: ObjectId;
  let ownerToken: string;
  let analystToken: string;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = new MongoClient(mongo.getUri());
    await client.connect();
    db = client.db(`test_${Date.now()}`);

    // Setup basic test data
    ownerId = new ObjectId();
    analystId = new ObjectId();
    orgId = new ObjectId();

    // Users
    await users(db).insertMany([
      { _id: ownerId, email: "owner@test.com", name: "Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
      { _id: analystId, email: "analyst@test.com", name: "Analyst", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() }
    ]);

    // Org
    await orgs(db).insertOne({
      _id: orgId, name: "Test Org", slug: "test-org", plan: "free", seatLimit: 5, createdAt: new Date(), updatedAt: new Date()
    });

    // Memberships
    await memberships(db).insertMany([
      { _id: new ObjectId(), orgId, userId: ownerId, role: "owner", status: "active", createdAt: new Date() },
      { _id: new ObjectId(), orgId, userId: analystId, role: "analyst", status: "active", createdAt: new Date() }
    ]);

    // Sessions
    ownerToken = randomToken();
    analystToken = randomToken();
    
    await sessions(db).insertMany([
      { _id: new ObjectId(), userId: ownerId, orgId, tokenHash: sha256(ownerToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null },
      { _id: new ObjectId(), userId: analystId, orgId, tokenHash: sha256(analystToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null }
    ]);
  }, 30000);

  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
    if (mongo) await mongo.stop();
  });

  it("Analyst cannot setGrant", async () => {
    await expect(setGrant(db, {
      rawToken: analystToken,
      orgId: orgId.toString(),
      userId: analystId.toString(),
      product: "mailguard",
      level: "operate",
      expiresAt: null,
      reason: "test"
    })).rejects.toThrow("Role cannot set product grants");
  });

  it("Analyst with no MailGuard grant -> 403 no_product_grant", async () => {
    // Need a session context for authorize
    const { loadSessionContext } = await import("../src/auth/session.js");
    const ctx = await loadSessionContext(db, analystToken);
    
    const result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });

    expect(result.allow).toBe(false);
    expect(result.reasonCode).toBe("no_product_grant");
  });

  it("Owner grants view -> export still 403 level_too_low", async () => {
    // Owner grants 'view' to analyst
    await setGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      userId: analystId.toString(),
      product: "mailguard",
      level: "view",
      expiresAt: null,
      reason: "giving view access"
    });

    const { loadSessionContext } = await import("../src/auth/session.js");
    const ctx = await loadSessionContext(db, analystToken);
    
    const result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });

    expect(result.allow).toBe(false);
    expect(result.reasonCode).toBe("level_too_low");
  });

  it("Owner grants operate -> export allow + audit allow", async () => {
    // Owner grants 'operate' to analyst
    await setGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      userId: analystId.toString(),
      product: "mailguard",
      level: "operate",
      expiresAt: null,
      reason: "giving operate access"
    });

    const { loadSessionContext } = await import("../src/auth/session.js");
    const ctx = await loadSessionContext(db, analystToken);
    
    const result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate" // This should trigger audit
    });

    expect(result.allow).toBe(true);

    // Check audit log
    const auditRows = await audit(db).find({ action: "operate", outcome: "allow" }).toArray();
    expect(auditRows.length).toBeGreaterThan(0);
    expect(auditRows[0].actorUserId.toString()).toBe(analystId.toString());
  });

  it("Expired grant -> 403 grant_expired", async () => {
    // Owner grants 'operate' but expired
    await setGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      userId: analystId.toString(),
      product: "mailguard",
      level: "operate",
      expiresAt: new Date(Date.now() - 10000), // past
      reason: "giving operate access temporarily"
    });

    const { loadSessionContext } = await import("../src/auth/session.js");
    const ctx = await loadSessionContext(db, analystToken);
    
    const result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });

    expect(result.allow).toBe(false);
    expect(result.reasonCode).toBe("grant_expired");
  });
});

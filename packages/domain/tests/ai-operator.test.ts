import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { proposeGrant, applyProposal, setPlan } from "../src/index.js";
import { users, orgs, memberships, sessions, grants, audit } from "../src/db/collections.js";
import { randomToken, sha256 } from "../src/security/crypto.js";

describe("AI Operator", () => {
  let mongo: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  let ownerId: ObjectId;
  let janeId: ObjectId;
  let orgId: ObjectId;
  let ownerToken: string;
  let janeToken: string;

  beforeAll(async () => {
    // Force mock adapter for tests
    process.env.LLM_PROVIDER = "mock";

    mongo = await MongoMemoryServer.create();
    client = new MongoClient(mongo.getUri());
    await client.connect();
    db = client.db(`test_ai_${Date.now()}`);

    ownerId = new ObjectId();
    janeId = new ObjectId();
    orgId = new ObjectId();

    await users(db).insertMany([
      { _id: ownerId, email: "owner@ai.test", name: "Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
      { _id: janeId, email: "jane@example.com", name: "Jane", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
    ]);

    await orgs(db).insertOne({
      _id: orgId,
      name: "AI Org",
      slug: "ai-org",
      plan: "team", // Start with team
      seatLimit: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await memberships(db).insertMany([
      { _id: new ObjectId(), orgId, userId: ownerId, role: "owner", status: "active", createdAt: new Date() },
      { _id: new ObjectId(), orgId, userId: janeId, role: "analyst", status: "active", createdAt: new Date() },
    ]);

    ownerToken = randomToken();
    janeToken = randomToken();

    await sessions(db).insertMany([
      { _id: new ObjectId(), userId: ownerId, orgId, tokenHash: sha256(ownerToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null },
      { _id: new ObjectId(), principalId: janeId, orgId, tokenHash: sha256(janeToken), expiresAt: new Date(Date.now() + 100000), createdAt: new Date(), revokedAt: null },
    ]);
  }, 30000);

  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
    if (mongo) await mongo.stop();
  });

  it("Propose on team plan → 403 plan_feature_locked", async () => {
    try {
      await proposeGrant(db, {
        rawToken: ownerToken,
        orgId: orgId.toString(),
        prompt: "give jane operate on mailguard",
      });
      throw new Error("should have thrown");
    } catch (err: any) {
      expect(err.statusCode ?? err.status).toBe(403);
      expect(err.message).toMatch(/plan_feature_locked|AI operator/i);
    }
  });

  it("Propose on enterprise plan works but does not mutate grants", async () => {
    await setPlan(db, { rawToken: ownerToken, orgId: orgId.toString(), plan: "enterprise" });

    const beforeGrants = await grants(db).countDocuments({ orgId, principalId: janeId });
    expect(beforeGrants).toBe(0);

    const command = await proposeGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      prompt: "give jane operate on mailguard",
    });

    expect(command.action).toBe("set_grant");
    expect(command.email).toBe("jane@example.com");
    expect(command.userId).toBe(janeId.toHexString());
    expect(command.level).toBe("operate");

    const afterGrants = await grants(db).countDocuments({ orgId, principalId: janeId });
    expect(afterGrants).toBe(0); // Propose does not mutate
  });

  it("Apply mutates the grants", async () => {
    const command = {
      action: "set_grant",
      userId: janeId.toHexString(),
      product: "mailguard",
      level: "operate",
      reason: "Applying test proposal",
      confidence: 1,
    };

    await applyProposal(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      command,
    });

    const afterGrants = await grants(db).countDocuments({ orgId, principalId: janeId, product: "mailguard", level: "operate" });
    expect(afterGrants).toBe(1);
    
    // Check audit logs
    const applyLog = await audit(db).findOne({ action: "ai.apply" });
    expect(applyLog).toBeTruthy();
    expect(applyLog?.target.id).toBe(janeId.toHexString());
  });

  it("Garbage JSON → reject", async () => {
    const command = await proposeGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      prompt: "this is complete garbage",
    });

    expect(command.action).toBe("reject");
  });
});

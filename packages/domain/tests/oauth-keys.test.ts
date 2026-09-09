import { describe, expect, it, beforeAll, afterAll } from "@jest/globals";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { 
  createOauthClient, startAuthorize, exchangeCode,
  createApiKey, revokeApiKey, authenticateBearer, authorize, setGrant 
} from "../src/index.js";
import { users, orgs, memberships, sessions, apiKeys, oauthCodes } from "../src/db/collections.js";
import { randomToken, sha256 } from "../src/security/crypto.js";
import { createHash } from "crypto";

describe("OAuth & API Keys", () => {
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
    db = client.db(`test_oauth_${Date.now()}`);

    ownerId = new ObjectId();
    analystId = new ObjectId();
    orgId = new ObjectId();

    await users(db).insertMany([
      { _id: ownerId, email: "owner@test.com", name: "Owner", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() },
      { _id: analystId, email: "analyst@test.com", name: "Analyst", passwordHash: "x", createdAt: new Date(), updatedAt: new Date() }
    ]);

    await orgs(db).insertOne({
      _id: orgId, name: "Test Org", slug: "test-org", plan: "team", seatLimit: 25, createdAt: new Date(), updatedAt: new Date()
    });

    await memberships(db).insertMany([
      { _id: new ObjectId(), orgId, userId: ownerId, role: "owner", status: "active", createdAt: new Date() },
      { _id: new ObjectId(), orgId, userId: analystId, role: "analyst", status: "active", createdAt: new Date() }
    ]);

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

  // --- API KEYS ---

  let rawApiKey: string;
  let apiKeyId: string;

  it("API key view cannot export; operate can", async () => {
    // Owner creates a 'view' API Key
    const viewKey = await createApiKey(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      name: "View Key",
      product: "mailguard",
      level: "view"
    });
    
    let ctx = await authenticateBearer(db, `Bearer ${viewKey.rawKey}`);
    expect(ctx).toBeDefined();

    let result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate" // trying to export
    });
    expect(result.allow).toBe(false);
    expect(result.reasonCode).toBe("level_too_low");

    // Owner creates an 'operate' API Key
    const opKey = await createApiKey(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      name: "Operate Key",
      product: "mailguard",
      level: "operate"
    });
    
    rawApiKey = opKey.rawKey;
    apiKeyId = opKey.id;

    ctx = await authenticateBearer(db, `Bearer ${opKey.rawKey}`);
    expect(ctx).toBeDefined();

    result = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate" // trying to export
    });
    expect(result.allow).toBe(true);
  });

  it("Revoked key 401", async () => {
    await revokeApiKey(db, ownerToken, orgId.toString(), apiKeyId);
    
    const ctx = await authenticateBearer(db, `Bearer ${rawApiKey}`);
    expect(ctx).toBeNull(); // auth fails
  });

  // --- OAUTH PKCE ---

  let clientId: string;
  let clientSecret: string;
  let authCode: string;
  const redirectUri = "http://localhost:3000/cb";
  const codeVerifier = "my_super_secret_verifier_string_that_is_long_enough";
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  it("Create OAuth Client", async () => {
    const client = await createOauthClient(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      name: "Demo App",
      redirectUris: [redirectUri]
    });
    clientId = client.clientId;
    clientSecret = client.clientSecret;
  });

  it("Start Authorize (Analyst logs in)", async () => {
    const res = await startAuthorize(db, {
      rawToken: analystToken,
      clientId,
      redirectUri,
      state: "xyz",
      codeChallenge,
      codeChallengeMethod: "S256"
    });
    
    expect(res.redirectTo).toContain("code=");
    const url = new URL(res.redirectTo);
    authCode = url.searchParams.get("code") as string;
    expect(authCode).toBeTruthy();
  });

  it("Wrong verifier fails", async () => {
    await expect(exchangeCode(db, {
      clientId,
      clientSecret,
      code: authCode,
      redirectUri,
      codeVerifier: "wrong_verifier"
    })).rejects.toThrow("Invalid code verifier");
  });

  it("PKCE exchange -> token can export if user has operate grant", async () => {
    const tokenRes = await exchangeCode(db, {
      clientId,
      clientSecret,
      code: authCode,
      redirectUri,
      codeVerifier
    });

    expect(tokenRes.access_token).toBeTruthy();

    const ctx = await authenticateBearer(db, `Bearer ${tokenRes.access_token}`);
    expect(ctx).toBeDefined();
    
    // Analyst tries to export, but has no grant yet
    let authRes = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });
    expect(authRes.allow).toBe(false);
    expect(authRes.reasonCode).toBe("no_product_grant");

    // Owner grants Analyst operate
    await setGrant(db, {
      rawToken: ownerToken,
      orgId: orgId.toString(),
      userId: analystId.toString(),
      product: "mailguard",
      level: "operate",
      expiresAt: null,
      reason: "for oauth test"
    });

    // Try again
    authRes = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });
    expect(authRes.allow).toBe(true);
  });

  it("Reusing code fails", async () => {
    await expect(exchangeCode(db, {
      clientId,
      clientSecret,
      code: authCode,
      redirectUri,
      codeVerifier
    })).rejects.toThrow("Code already consumed");
  });

  it("Cookie session still works", async () => {
    const { loadSessionContext } = await import("../src/auth/session.js");
    const ctx = await loadSessionContext(db, analystToken);
    expect(ctx).toBeDefined();

    const authRes = await authorize(db, ctx!, {
      orgId,
      product: "mailguard",
      productAction: "operate"
    });
    // Analyst still has the grant from the previous test
    expect(authRes.allow).toBe(true);
  });
});

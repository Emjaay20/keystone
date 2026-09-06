import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, type Database } from "../src/db/client.js";
import { register, me } from "../src/auth/service.js";
import { createOrg } from "../src/orgs/service.js";
import { createInvite, listInvites, acceptInvite } from "../src/invites/service.js";
import { invites, memberships } from "../src/db/collections.js";

describe("slice 2 — invites (domain)", () => {
  let mongo: MongoMemoryServer;
  let database: Database;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    database = await connectDb(mongo.getUri("keystone_invites"));
  }, 30000);

  afterAll(async () => {
    await database.client.close();
    await mongo.stop();
  });

  it("owner invites analyst, who accepts and becomes active", async () => {
    // 1. Owner registers and creates org
    const { token: ownerToken } = await register(database.db, {
      email: "owner@test.com",
      name: "Owner",
      password: "correct-horse-battery"
    });
    const org = await createOrg(database.db, ownerToken, { name: "Test Org" });
    const orgId = org.org!.id;

    // 2. Owner invites analyst
    const inviteRes = await createInvite(database.db, ownerToken, orgId, {
      email: "analyst@test.com",
      role: "analyst"
    });
    expect(inviteRes.token).toBeDefined();

    const pending = await listInvites(database.db, ownerToken, orgId);
    expect(pending.invites).toHaveLength(1);
    expect(pending.invites[0].email).toBe("analyst@test.com");

    // 3. Analyst registers
    const { token: analystToken } = await register(database.db, {
      email: "analyst@test.com",
      name: "Analyst",
      password: "correct-horse-battery"
    });

    // 4. Analyst accepts invite
    await acceptInvite(database.db, analystToken, { token: inviteRes.token });

    // 5. Verify /me has the org and analyst role
    const analystMe = await me(database.db, analystToken);
    expect(analystMe.org?.id).toBe(orgId);
    expect(analystMe.role).toBe("analyst");

    // 6. Invite is no longer in pending list
    const pendingAfter = await listInvites(database.db, ownerToken, orgId);
    expect(pendingAfter.invites).toHaveLength(0);
  });

  it("analyst cannot invite others", async () => {
    // The previous test left analyst@test.com active in Test Org
    const { token: analystToken } = await register(database.db, {
      email: "analyst2@test.com", // registering again since token from previous test is lost unless we return it
      name: "Analyst 2",
      password: "correct-horse-battery"
    });
    
    const { token: ownerToken } = await register(database.db, {
      email: "owner2@test.com",
      name: "Owner 2",
      password: "correct-horse-battery"
    });
    const org = await createOrg(database.db, ownerToken, { name: "Test Org 2" });
    const orgId = org.org!.id;

    const inviteRes = await createInvite(database.db, ownerToken, orgId, {
      email: "analyst2@test.com",
      role: "analyst"
    });

    await acceptInvite(database.db, analystToken, { token: inviteRes.token });

    // Analyst tries to invite
    await expect(createInvite(database.db, analystToken, orgId, {
      email: "stranger@test.com",
      role: "readonly"
    })).rejects.toThrow("Only owners and admins can invite members");
  });

  it("stranger cannot accept someone else's invite", async () => {
    const { token: ownerToken } = await register(database.db, {
      email: "owner3@test.com",
      name: "Owner 3",
      password: "correct-horse-battery"
    });
    const org = await createOrg(database.db, ownerToken, { name: "Test Org 3" });
    
    const inviteRes = await createInvite(database.db, ownerToken, org.org!.id, {
      email: "victim@test.com",
      role: "admin"
    });

    const { token: strangerToken } = await register(database.db, {
      email: "stranger@test.com",
      name: "Stranger",
      password: "correct-horse-battery"
    });

    await expect(acceptInvite(database.db, strangerToken, { token: inviteRes.token }))
      .rejects.toThrow("This invite was sent to a different email address");
  });

  it("expired token results in bad request", async () => {
    const { token: ownerToken } = await register(database.db, {
      email: "owner4@test.com",
      name: "Owner 4",
      password: "correct-horse-battery"
    });
    const org = await createOrg(database.db, ownerToken, { name: "Test Org 4" });

    const inviteRes = await createInvite(database.db, ownerToken, org.org!.id, {
      email: "slowpoke@test.com",
      role: "readonly"
    });

    // Manually expire the invite in DB
    await invites(database.db).updateOne(
      { email: "slowpoke@test.com" },
      { $set: { expiresAt: new Date(Date.now() - 1000) } } // Past date
    );

    const { token: slowToken } = await register(database.db, {
      email: "slowpoke@test.com",
      name: "Slowpoke",
      password: "correct-horse-battery"
    });

    await expect(acceptInvite(database.db, slowToken, { token: inviteRes.token }))
      .rejects.toThrow("Invalid or expired invite token");
  });
});

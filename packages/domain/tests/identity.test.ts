import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, type Database } from "../src/db/client.js";
import { register, login, me } from "../src/auth/service.js";
import { createOrg, listOrgs } from "../src/orgs/service.js";

describe("slice 1 — identity (domain)", () => {
  let mongo: MongoMemoryServer;
  let database: Database;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    database = await connectDb(mongo.getUri("keystone"));
  }, 30000);

  afterAll(async () => {
    await database.client.close();
    await mongo.stop();
  });

  it("registers, creates an org, and scopes /me to that org", async () => {
    const { token, payload: registerPayload } = await register(database.db, {
      email: "yusuf@example.com",
      name: "Yusuf",
      password: "correct-horse-battery"
    });
    
    expect(token).toBeDefined();
    expect(registerPayload.org).toBeNull();

    const created = await createOrg(database.db, token, { name: "Northwind Security" });
    expect(created.role).toBe("owner");
    expect(created.org?.name).toBe("Northwind Security");

    const mePayload = await me(database.db, token);
    expect(mePayload.org?.name).toBe("Northwind Security");
    expect(mePayload.role).toBe("owner");
  });

  it("rejects short passwords and unknown logins without leaking account existence", async () => {
    await expect(register(database.db, { email: "a@b.co", name: "A", password: "short" }))
      .rejects.toThrow();

    await expect(login(database.db, { email: "nobody@example.com", password: "correct-horse-battery" }))
      .rejects.toThrow("Invalid email or password");
  });

  it("does not let a stranger list another tenant's orgs", async () => {
    await register(database.db, {
      email: "owner@example.com",
      name: "Owner",
      password: "correct-horse-battery"
    });

    const { token: strangerToken } = await register(database.db, {
      email: "stranger@example.com",
      name: "Stranger",
      password: "correct-horse-battery"
    });

    const list = await listOrgs(database.db, strangerToken);
    expect(list.orgs).toEqual([]);
  });
});

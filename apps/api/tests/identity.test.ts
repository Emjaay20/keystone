import { MongoMemoryServer } from "mongodb-memory-server";
import { buildApp } from "../src/app.js";
import { connectDb, type Database } from "../src/db/client.js";
import { loadEnv } from "../src/config/env.js";

describe("slice 1 — identity", () => {
  let mongo: MongoMemoryServer;
  let database: Database;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    database = await connectDb(mongo.getUri("keystone"));
    app = await buildApp(loadEnv({ nodeEnv: "test", cookieSecure: false }), database);
    await app.ready();
  }, 30000);

  afterAll(async () => {
    await app.close();
    await database.client.close();
    await mongo.stop();
  });

  function cookieHeader(res: { headers: Record<string, unknown> }) {
    const raw = res.headers["set-cookie"];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return list.map(String).join("; ");
  }

  it("registers, creates an org, and scopes /me to that org", async () => {
    const register = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "yusuf@example.com",
        name: "Yusuf",
        password: "correct-horse-battery"
      }
    });
    expect(register.statusCode).toBe(200);
    const sessionCookie = cookieHeader(register);
    expect(sessionCookie).toContain("ks_session=");
    expect(register.json().org).toBeNull();

    const created = await app.inject({
      method: "POST",
      url: "/orgs",
      headers: { cookie: sessionCookie },
      payload: { name: "Northwind Security" }
    });
    expect(created.statusCode).toBe(200);
    expect(created.json().role).toBe("owner");
    expect(created.json().org.name).toBe("Northwind Security");

    const me = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: sessionCookie }
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().org.name).toBe("Northwind Security");
    expect(me.json().role).toBe("owner");
  });

  it("rejects short passwords and unknown logins without leaking account existence", async () => {
    const short = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "a@b.co", name: "A", password: "short" }
    });
    expect(short.statusCode).toBe(400);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "nobody@example.com", password: "correct-horse-battery" }
    });
    expect(login.statusCode).toBe(401);
    expect(login.json().message).toBe("Invalid email or password");
  });

  it("does not let a stranger list another tenant's orgs", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "owner@example.com",
        name: "Owner",
        password: "correct-horse-battery"
      }
    });

    const stranger = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        email: "stranger@example.com",
        name: "Stranger",
        password: "correct-horse-battery"
      }
    });

    const list = await app.inject({
      method: "GET",
      url: "/orgs",
      headers: { cookie: cookieHeader(stranger) }
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().orgs).toEqual([]);
  });
});

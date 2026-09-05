import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import { createOrg, listOrgs, switchOrg } from "@keystone/domain";
import { setSessionCookie } from "../auth/session.js";
import type { AppEnv } from "../../config/env.js";

export async function orgRoutes(
  app: FastifyInstance,
  deps: { db: Database; env: AppEnv }
) {
  const { db } = deps.db;

  app.post("/orgs", async (request, reply) => {
    const token = request.cookies["ks_session"];
    const payload = await createOrg(db, token, request.body);
    return payload;
  });

  app.get("/orgs", async (request) => {
    const token = request.cookies["ks_session"];
    return await listOrgs(db, token);
  });

  app.post("/orgs/:orgId/switch", async (request, reply) => {
    const cookieToken = request.cookies["ks_session"];
    const { token, payload } = await switchOrg(db, cookieToken, request.params);
    setSessionCookie(reply, token, deps.env.cookieSecure);
    return payload;
  });
}

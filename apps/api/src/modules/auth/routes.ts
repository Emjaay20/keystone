import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../../config/env.js";
import type { Database } from "../../db/client.js";
import { register, login, logout, me } from "@keystone/domain";
import { setSessionCookie, clearSessionCookie } from "./session.js";

export async function authRoutes(
  app: FastifyInstance,
  deps: { db: Database; env: AppEnv }
) {
  const { db } = deps.db;

  app.post("/auth/register", async (request, reply) => {
    const { token, payload } = await register(db, request.body);
    setSessionCookie(reply, token, deps.env.cookieSecure);
    return payload;
  });

  app.post("/auth/login", async (request, reply) => {
    const { token, payload } = await login(db, request.body);
    setSessionCookie(reply, token, deps.env.cookieSecure);
    return payload;
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies["ks_session"];
    const result = await logout(db, token);
    clearSessionCookie(reply, deps.env.cookieSecure);
    return result;
  });

  app.get("/auth/me", async (request) => {
    const token = request.cookies["ks_session"];
    return await me(db, token);
  });
}

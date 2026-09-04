import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";
import type { AppEnv } from "./config/env.js";
import type { Database } from "./db/client.js";
import { HttpError } from "./http/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { orgRoutes } from "./modules/orgs/routes.js";

export async function buildApp(env: AppEnv, database: Database): Promise<FastifyInstance> {
  const app = Fastify({ logger: env.nodeEnv !== "test" });
  await app.register(cookie);

  app.get("/health", async () => ({ ok: true, service: "keystone-api" }));

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError || error.name === "ZodError") {
      return reply.status(400).send({
        error: "bad_request",
        message: "Invalid request",
        // @ts-expect-error - if it's a ZodError from another module, flatten might not be perfectly typed but it exists
        details: (error as ZodError).flatten ? (error as ZodError).flatten() : error
      });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message
      });
    }
    app.log.error(error);
    const detail = error instanceof Error ? error.message : "Something went wrong";
    return reply.status(500).send({
      error: "internal",
      message: env.nodeEnv === "test" ? detail : "Something went wrong"
    });
  });

  await app.register(async (instance) => {
    await authRoutes(instance, { db: database, env });
    await orgRoutes(instance, { db: database, env });
  });

  return app;
}

import { loadEnv } from "./config/env.js";
import { connectDb } from "./db/client.js";
import { buildApp } from "./app.js";

async function main() {
  const env = loadEnv();
  const database = await connectDb(env.mongoUri);
  const app = await buildApp(env, database);
  await app.listen({ port: env.port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

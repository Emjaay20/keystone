import { MongoClient, type Db } from "mongodb";

export type Database = {
  client: MongoClient;
  db: Db;
};

export async function connectDb(uri: string): Promise<Database> {
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.replace(/^\//, "") || "keystone";
  const db = client.db(dbName);
  await ensureIndexes(db);
  return { client, db };
}

export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("orgs").createIndex({ slug: 1 }, { unique: true });
  await db.collection("memberships").createIndex({ orgId: 1, userId: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

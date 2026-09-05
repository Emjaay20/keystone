import { connectDb, type Database } from "@keystone/domain";

declare global {
  var _keystoneDb: Promise<Database> | undefined;
}

const uri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/keystone";

export async function getDb() {
  if (process.env.NODE_ENV === "development") {
    if (!global._keystoneDb) {
      global._keystoneDb = connectDb(uri);
    }
    return (await global._keystoneDb).db;
  }
  
  const conn = await connectDb(uri);
  return conn.db;
}

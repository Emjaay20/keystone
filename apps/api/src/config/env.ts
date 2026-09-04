export type AppEnv = {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  cookieSecure: boolean;
};

export function loadEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    nodeEnv: overrides.nodeEnv ?? process.env.NODE_ENV ?? "development",
    port: overrides.port ?? Number(process.env.PORT ?? 8787),
    mongoUri: overrides.mongoUri ?? process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/keystone",
    cookieSecure: overrides.cookieSecure ?? process.env.COOKIE_SECURE === "true"
  };
}

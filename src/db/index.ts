import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | undefined;

function createDb(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(databaseUrl), { schema });
}

/** Lazily create the client so importing this module during `next build` does not require env vars. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    if (!cached) {
      cached = createDb();
    }
    const value = Reflect.get(cached, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

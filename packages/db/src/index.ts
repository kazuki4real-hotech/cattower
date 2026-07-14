import { drizzle } from "drizzle-orm/d1";

import { schema } from "./schema";

export * from "./schema";

export function createDatabase(binding: D1Database) {
  return drizzle(binding, { schema });
}

export type CattowerDatabase = ReturnType<typeof createDatabase>;

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDatabase, schema } from "@cattower/db";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getRuntimeEnv } from "@/lib/cloudflare";
import { ensureUserFoundation } from "@/lib/foundation";

export function getAuth() {
  const env = getRuntimeEnv();
  const db = createDatabase(env.DB);

  return betterAuth({
    appName: "Cattower",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            await ensureUserFoundation(db, createdUser.id, createdUser.name);
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

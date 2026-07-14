import { createDatabase } from "@cattower/db";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { getRuntimeEnv } from "@/lib/cloudflare";
import { ensureUserFoundation } from "@/lib/foundation";

export async function getViewer(requestHeaders?: Headers) {
  const env = getRuntimeEnv();
  const db = createDatabase(env.DB);
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders ?? (await headers()) });

  if (!session) return null;
  const household = await ensureUserFoundation(db, session.user.id, session.user.name);
  return { env, db, session, household };
}

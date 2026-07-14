import { getCloudflareContext } from "@opennextjs/cloudflare";

export type RuntimeEnv = CloudflareEnv & {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  REALTIME_WEBSOCKET_URL: string;
  TOWN_TICKET_SECRET: string;
};

export function getRuntimeEnv(): RuntimeEnv {
  return getCloudflareContext().env as RuntimeEnv;
}

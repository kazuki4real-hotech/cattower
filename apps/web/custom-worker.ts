// OpenNext creates this module during `opennextjs-cloudflare build`.
// @ts-expect-error -- generated build output intentionally has no source declaration.
import openNextWorker from "./.open-next/worker.js";

import { cleanupOrphanedMedia } from "./lib/media-cleanup";

export default {
  fetch: openNextWorker.fetch,
  async scheduled(controller, env, ctx) {
    void ctx;
    const result = await cleanupOrphanedMedia(env);
    console.log(
      JSON.stringify({
        event: "media_cleanup_completed",
        cron: controller.cron,
        ...result,
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

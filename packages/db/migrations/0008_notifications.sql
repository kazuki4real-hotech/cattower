CREATE TABLE `notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `recipient_user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `type` text NOT NULL CHECK (`type` IN ('household_invite', 'household_joined', 'upload_ready', 'upload_failed', 'export_ready', 'share_expiring', 'town_digest')),
  `resource_type` text CHECK (`resource_type` IN ('household', 'cat', 'media_asset')),
  `resource_id` text,
  `payload_json` text DEFAULT '{}' NOT NULL,
  `dedupe_key` text NOT NULL,
  `read_at` integer,
  `expires_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `notifications_recipient_read_created_idx` ON `notifications` (`recipient_user_id`, `read_at`, `created_at`);
CREATE UNIQUE INDEX `notifications_recipient_dedupe_uidx` ON `notifications` (`recipient_user_id`, `dedupe_key`);
CREATE INDEX `notifications_expires_idx` ON `notifications` (`expires_at`);

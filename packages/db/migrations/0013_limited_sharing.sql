CREATE TABLE `share_links` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `created_by` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `resource_type` text NOT NULL CHECK (`resource_type` IN ('entry', 'board')),
  `resource_id` text NOT NULL,
  `token_hash` text NOT NULL UNIQUE,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  `last_accessed_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `share_links_household_resource_idx` ON `share_links` (`household_id`, `resource_type`, `resource_id`, `created_at`);
CREATE INDEX `share_links_creator_created_idx` ON `share_links` (`created_by`, `created_at`);
CREATE INDEX `share_links_token_state_idx` ON `share_links` (`token_hash`, `revoked_at`, `expires_at`);

CREATE TABLE `share_rate_limits` (
  `key_hash` text PRIMARY KEY NOT NULL,
  `window_started_at` integer NOT NULL,
  `request_count` integer DEFAULT 1 NOT NULL,
  `expires_at` integer NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `share_rate_limits_expires_idx` ON `share_rate_limits` (`expires_at`);

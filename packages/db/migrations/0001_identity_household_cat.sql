PRAGMA foreign_keys = ON;

CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL UNIQUE,
  `email_verified` integer DEFAULT 0 NOT NULL,
  `image` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL UNIQUE,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);
CREATE UNIQUE INDEX `account_provider_account_uidx` ON `account` (`provider_id`, `account_id`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);

CREATE TABLE `user_preferences` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `locale` text DEFAULT 'ja' NOT NULL,
  `timezone` text DEFAULT 'Asia/Tokyo' NOT NULL,
  `town_enabled` integer DEFAULT 0 NOT NULL,
  `town_digest` text DEFAULT 'off' NOT NULL CHECK (`town_digest` IN ('off', 'daily')),
  `reduced_motion_override` integer,
  `analytics_consent` integer DEFAULT 0 NOT NULL,
  `memory_preferences_json` text DEFAULT '[]' NOT NULL,
  `onboarding_step` integer DEFAULT 0 NOT NULL CHECK (`onboarding_step` BETWEEN 0 AND 3),
  `onboarding_completed_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE TABLE `households` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `owner_user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE restrict,
  `deletion_requested_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE UNIQUE INDEX `households_owner_user_id_uidx` ON `households` (`owner_user_id`);

CREATE TABLE `household_members` (
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `role` text NOT NULL CHECK (`role` IN ('owner', 'editor')),
  `status` text NOT NULL CHECK (`status` IN ('invited', 'active', 'revoked')),
  `invited_by` text REFERENCES `user`(`id`) ON DELETE set null,
  `joined_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  PRIMARY KEY (`household_id`, `user_id`)
);
CREATE INDEX `household_members_user_status_idx` ON `household_members` (`user_id`, `status`);

CREATE TABLE `cats` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `nickname` text,
  `theme_color` text DEFAULT 'mint' NOT NULL,
  `profile_asset_id` text,
  `life_status` text DEFAULT 'living' NOT NULL CHECK (`life_status` IN ('living', 'memorial')),
  `town_access` text DEFAULT 'disabled' NOT NULL CHECK (`town_access` IN ('disabled', 'owners_only', 'household_members')),
  `archived_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `cats_household_archived_idx` ON `cats` (`household_id`, `archived_at`);

CREATE TABLE `media_assets` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `owner_user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE restrict,
  `kind` text NOT NULL CHECK (`kind` IN ('image', 'video')),
  `provider` text NOT NULL CHECK (`provider` IN ('r2', 'stream')),
  `provider_key` text NOT NULL UNIQUE,
  `original_filename` text NOT NULL,
  `mime_type` text NOT NULL,
  `byte_size` integer,
  `width` integer,
  `height` integer,
  `status` text NOT NULL CHECK (`status` IN ('pending', 'uploaded', 'processing', 'ready', 'failed', 'deleting')),
  `deleted_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `media_assets_household_status_idx` ON `media_assets` (`household_id`, `status`);

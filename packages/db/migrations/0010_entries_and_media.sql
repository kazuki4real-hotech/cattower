ALTER TABLE `media_assets` ADD `purpose` text DEFAULT 'profile' NOT NULL CHECK (`purpose` IN ('profile', 'entry'));

CREATE TABLE `entries` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `primary_cat_id` text REFERENCES `cats`(`id`) ON DELETE set null,
  `author_user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE restrict,
  `title` text,
  `body` text,
  `occurred_at` integer NOT NULL,
  `occurred_precision` text DEFAULT 'day' NOT NULL CHECK (`occurred_precision` IN ('minute', 'day', 'month')),
  `status` text DEFAULT 'ready' NOT NULL CHECK (`status` IN ('draft', 'ready', 'processing', 'failed')),
  `version` integer DEFAULT 1 NOT NULL,
  `deleted_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE INDEX `entries_household_occurred_deleted_idx` ON `entries` (`household_id`, `occurred_at`, `deleted_at`);

CREATE TABLE `entry_cats` (
  `entry_id` text NOT NULL REFERENCES `entries`(`id`) ON DELETE cascade,
  `cat_id` text NOT NULL REFERENCES `cats`(`id`) ON DELETE cascade,
  `sort_order` integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (`entry_id`, `cat_id`)
);

CREATE INDEX `entry_cats_cat_entry_idx` ON `entry_cats` (`cat_id`, `entry_id`);

CREATE TABLE `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `normalized_name` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX `tags_household_normalized_uidx` ON `tags` (`household_id`, `normalized_name`);

CREATE TABLE `entry_tags` (
  `entry_id` text NOT NULL REFERENCES `entries`(`id`) ON DELETE cascade,
  `tag_id` text NOT NULL REFERENCES `tags`(`id`) ON DELETE cascade,
  PRIMARY KEY (`entry_id`, `tag_id`)
);

CREATE TABLE `entry_media` (
  `entry_id` text NOT NULL REFERENCES `entries`(`id`) ON DELETE cascade,
  `media_asset_id` text NOT NULL REFERENCES `media_assets`(`id`) ON DELETE restrict,
  `role` text DEFAULT 'primary' NOT NULL CHECK (`role` IN ('primary', 'gallery')),
  `sort_order` integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (`entry_id`, `media_asset_id`)
);

CREATE INDEX `entry_media_asset_idx` ON `entry_media` (`media_asset_id`);

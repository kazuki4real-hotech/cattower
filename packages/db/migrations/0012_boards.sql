CREATE TABLE `boards` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `created_by` text NOT NULL REFERENCES `user`(`id`) ON DELETE restrict,
  `name` text NOT NULL,
  `normalized_name` text NOT NULL,
  `sort_mode` text DEFAULT 'manual' NOT NULL CHECK (`sort_mode` IN ('manual', 'newest', 'oldest')),
  `cover_asset_id` text REFERENCES `media_assets`(`id`) ON DELETE set null,
  `version` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

CREATE UNIQUE INDEX `boards_household_normalized_uidx` ON `boards` (`household_id`, `normalized_name`);
CREATE INDEX `boards_household_updated_idx` ON `boards` (`household_id`, `updated_at`);

CREATE TABLE `board_items` (
  `board_id` text NOT NULL REFERENCES `boards`(`id`) ON DELETE cascade,
  `entry_id` text NOT NULL REFERENCES `entries`(`id`) ON DELETE cascade,
  `sort_key` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  PRIMARY KEY (`board_id`, `entry_id`)
);

CREATE INDEX `board_items_board_sort_idx` ON `board_items` (`board_id`, `sort_key`);
CREATE INDEX `board_items_entry_idx` ON `board_items` (`entry_id`);

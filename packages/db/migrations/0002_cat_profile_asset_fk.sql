PRAGMA defer_foreign_keys = ON;

CREATE TABLE `cats_next` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `name` text NOT NULL,
  `nickname` text,
  `theme_color` text DEFAULT 'mint' NOT NULL,
  `profile_asset_id` text REFERENCES `media_assets`(`id`) ON DELETE set null,
  `life_status` text DEFAULT 'living' NOT NULL CHECK (`life_status` IN ('living', 'memorial')),
  `town_access` text DEFAULT 'disabled' NOT NULL CHECK (`town_access` IN ('disabled', 'owners_only', 'household_members')),
  `archived_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `cats_next` SELECT * FROM `cats`;
DROP TABLE `cats`;
ALTER TABLE `cats_next` RENAME TO `cats`;
CREATE INDEX `cats_household_archived_idx` ON `cats` (`household_id`, `archived_at`);

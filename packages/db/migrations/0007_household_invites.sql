CREATE TABLE `household_invites` (
  `id` text PRIMARY KEY NOT NULL,
  `household_id` text NOT NULL REFERENCES `households`(`id`) ON DELETE cascade,
  `token_hash` text NOT NULL UNIQUE,
  `created_by` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `role` text DEFAULT 'editor' NOT NULL CHECK (`role` = 'editor'),
  `expires_at` integer NOT NULL,
  `accepted_at` integer,
  `accepted_by` text REFERENCES `user`(`id`) ON DELETE set null,
  `revoked_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
CREATE INDEX `household_invites_household_created_idx` ON `household_invites` (`household_id`, `created_at`);

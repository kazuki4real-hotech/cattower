PRAGMA defer_foreign_keys = ON;

DROP INDEX `cats_household_archived_idx`;
ALTER TABLE `cats` DROP COLUMN `theme_color`;
ALTER TABLE `cats` DROP COLUMN `archived_at`;
CREATE INDEX `cats_household_idx` ON `cats` (`household_id`);

CREATE TABLE `user_preferences_next` (
  `user_id` text PRIMARY KEY NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `locale` text DEFAULT 'ja' NOT NULL,
  `timezone` text DEFAULT 'Asia/Tokyo' NOT NULL,
  `town_enabled` integer DEFAULT false NOT NULL,
  `town_digest` text DEFAULT 'off' NOT NULL CHECK (`town_digest` IN ('off', 'daily')),
  `reduced_motion_override` integer,
  `analytics_consent` integer DEFAULT false NOT NULL,
  `onboarding_step` integer DEFAULT 0 NOT NULL CHECK (`onboarding_step` BETWEEN 0 AND 3),
  `active_household_id` text,
  `active_cat_id` text,
  `onboarding_prompted_at` integer,
  `onboarding_completed_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);

INSERT INTO `user_preferences_next` (
  `user_id`, `locale`, `timezone`, `town_enabled`, `town_digest`,
  `reduced_motion_override`, `analytics_consent`, `onboarding_step`,
  `active_household_id`, `active_cat_id`, `onboarding_prompted_at`,
  `onboarding_completed_at`, `created_at`, `updated_at`
)
SELECT
  `user_id`, `locale`, `timezone`, `town_enabled`, `town_digest`,
  `reduced_motion_override`, `analytics_consent`,
  CASE WHEN `onboarding_step` > 3 THEN 3 ELSE `onboarding_step` END,
  `active_household_id`, `active_cat_id`, `onboarding_prompted_at`,
  `onboarding_completed_at`, `created_at`, `updated_at`
FROM `user_preferences`;

DROP TABLE `user_preferences`;
ALTER TABLE `user_preferences_next` RENAME TO `user_preferences`;

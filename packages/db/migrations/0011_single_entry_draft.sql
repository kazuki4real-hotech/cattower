CREATE UNIQUE INDEX `entries_author_household_draft_uidx`
ON `entries` (`household_id`, `author_user_id`)
WHERE `status` = 'draft' AND `deleted_at` IS NULL;

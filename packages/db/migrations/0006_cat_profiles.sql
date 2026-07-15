ALTER TABLE `user_preferences` ADD `active_cat_id` text;
ALTER TABLE `cats` ADD `birth_date` integer;
ALTER TABLE `cats` ADD `birth_precision` text NOT NULL DEFAULT 'unknown';
ALTER TABLE `cats` ADD `adoption_date` integer;

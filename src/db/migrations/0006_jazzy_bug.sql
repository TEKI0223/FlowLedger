ALTER TABLE `categories` ADD `usage_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `last_used_at` text;--> statement-breakpoint
UPDATE `categories`
SET
  `usage_count` = (
    SELECT count(*)
    FROM `transactions`
    WHERE `transactions`.`category_id` = `categories`.`id`
  ),
  `last_used_at` = (
    SELECT max(`transactions`.`created_at`)
    FROM `transactions`
    WHERE `transactions`.`category_id` = `categories`.`id`
  );

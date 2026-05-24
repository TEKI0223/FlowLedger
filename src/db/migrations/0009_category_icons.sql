ALTER TABLE `categories` ADD `icon_key` text;--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'housing' WHERE `id` = 'housing';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'game' WHERE `id` = 'game';--> statement-breakpoint
UPDATE `categories` SET `name` = '食材', `parent_id` = NULL, `icon_key` = 'grocery' WHERE `id` = 'grocery';--> statement-breakpoint
UPDATE `categories` SET `parent_id` = 'grocery' WHERE `id` IN ('vagetables', 'fruits', 'meat', 'seafood', 'snacks', 'beverages', 'alcohol', 'milk');--> statement-breakpoint
UPDATE `categories` SET `parent_id` = NULL, `icon_key` = 'dining' WHERE `id` = 'dining';--> statement-breakpoint
INSERT INTO `categories` (`id`, `name`, `parent_id`, `icon_key`, `created_at`, `updated_at`)
VALUES ('ready-meal', '简餐', 'dining', NULL, datetime('now'), datetime('now'))
ON CONFLICT(`id`) DO UPDATE SET
  `name` = excluded.`name`,
  `parent_id` = excluded.`parent_id`,
  `updated_at` = excluded.`updated_at`;--> statement-breakpoint
UPDATE `categories` SET `parent_id` = 'dining', `icon_key` = 'coffee' WHERE `id` = 'coffee';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'ready-meal' WHERE `category_id` = 'convenience-store';--> statement-breakpoint
DELETE FROM `categories`
WHERE `id` = 'convenience-store'
  AND NOT EXISTS (SELECT 1 FROM `transactions` WHERE `transactions`.`category_id` = `categories`.`id`)
  AND NOT EXISTS (SELECT 1 FROM `quick_entry_templates` WHERE `quick_entry_templates`.`category_id` = `categories`.`id`)
  AND NOT EXISTS (SELECT 1 FROM `recurring_items` WHERE `recurring_items`.`category_id` = `categories`.`id`);--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'transport' WHERE `id` = 'transport';--> statement-breakpoint
UPDATE `categories` SET `parent_id` = NULL, `icon_key` = 'daily-goods' WHERE `id` = 'daily-goods';--> statement-breakpoint
UPDATE `categories` SET `parent_id` = 'daily-goods' WHERE `id` IN ('paper-towels', 'tissues', 'toilet-paper', 'toothpaste', 'shampoo');--> statement-breakpoint
INSERT INTO `categories` (`id`, `name`, `parent_id`, `icon_key`, `created_at`, `updated_at`)
VALUES ('beauty', '美妆护肤', NULL, 'beauty', datetime('now'), datetime('now'))
ON CONFLICT(`id`) DO UPDATE SET
  `name` = excluded.`name`,
  `parent_id` = excluded.`parent_id`,
  `icon_key` = excluded.`icon_key`,
  `updated_at` = excluded.`updated_at`;--> statement-breakpoint
UPDATE `categories` SET `parent_id` = 'beauty' WHERE `id` IN ('skincare', 'makeup', 'face-wash');--> statement-breakpoint
UPDATE `categories` SET `parent_id` = NULL, `icon_key` = 'electronics' WHERE `id` = 'electronics';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'electronics' WHERE `category_id` = 'shopping';--> statement-breakpoint
UPDATE `categories` SET `parent_id` = NULL, `icon_key` = 'clothing' WHERE `id` = 'clothing';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'subscription' WHERE `id` = 'subscription';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'medical' WHERE `id` = 'medical';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'entertainment' WHERE `id` = 'entertainment';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'travel' WHERE `id` = 'travel';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'gift' WHERE `id` = 'gift';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'fees-tax' WHERE `id` = 'fees-tax';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'income' WHERE `id` = 'income-salary';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'refund' WHERE `id` = 'refund';--> statement-breakpoint
UPDATE `categories` SET `icon_key` = 'other' WHERE `id` = 'other';--> statement-breakpoint
DELETE FROM `categories`
WHERE `id` IN ('food', 'shopping')
  AND NOT EXISTS (SELECT 1 FROM `categories` AS child WHERE child.`parent_id` = `categories`.`id`)
  AND NOT EXISTS (SELECT 1 FROM `transactions` WHERE `transactions`.`category_id` = `categories`.`id`)
  AND NOT EXISTS (SELECT 1 FROM `quick_entry_templates` WHERE `quick_entry_templates`.`category_id` = `categories`.`id`)
  AND NOT EXISTS (SELECT 1 FROM `recurring_items` WHERE `recurring_items`.`category_id` = `categories`.`id`);

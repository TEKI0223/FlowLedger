UPDATE `transactions` SET `category_id` = 'ready-meal' WHERE `category_id` = 'convenience-store';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'ready-meal' WHERE `category_id` = 'convenience-store';--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'ready-meal' WHERE `category_id` = 'convenience-store';--> statement-breakpoint
DELETE FROM `categories` WHERE `id` = 'convenience-store';--> statement-breakpoint
UPDATE `transactions` SET `category_id` = 'electronics' WHERE `category_id` = 'shopping';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'electronics' WHERE `category_id` = 'shopping';--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'electronics' WHERE `category_id` = 'shopping';--> statement-breakpoint
DELETE FROM `categories` WHERE `id` = 'shopping';--> statement-breakpoint
UPDATE `transactions` SET `category_id` = 'ready-meal' WHERE `category_id` = 'food';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'ready-meal' WHERE `category_id` = 'food';--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'ready-meal' WHERE `category_id` = 'food';--> statement-breakpoint
DELETE FROM `categories` WHERE `id` = 'food';

-- 移除过度细分的子类，把已有引用归并到父类。手写迁移，与 scripts/seed.mjs 的清理同步。
-- 食材子类（保留 alcohol / snacks）：vagetables / fruits / meat / seafood / beverages / milk → grocery
UPDATE `transactions` SET `category_id` = 'grocery' WHERE `category_id` IN ('vagetables', 'fruits', 'meat', 'seafood', 'beverages', 'milk');--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'grocery' WHERE `category_id` IN ('vagetables', 'fruits', 'meat', 'seafood', 'beverages', 'milk');--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'grocery' WHERE `category_id` IN ('vagetables', 'fruits', 'meat', 'seafood', 'beverages', 'milk');--> statement-breakpoint
DELETE FROM `categories` WHERE `id` IN ('vagetables', 'fruits', 'meat', 'seafood', 'beverages', 'milk');--> statement-breakpoint
-- 日用品子类 → daily-goods
UPDATE `transactions` SET `category_id` = 'daily-goods' WHERE `category_id` IN ('paper-towels', 'tissues', 'toilet-paper', 'toothpaste', 'shampoo');--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'daily-goods' WHERE `category_id` IN ('paper-towels', 'tissues', 'toilet-paper', 'toothpaste', 'shampoo');--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'daily-goods' WHERE `category_id` IN ('paper-towels', 'tissues', 'toilet-paper', 'toothpaste', 'shampoo');--> statement-breakpoint
DELETE FROM `categories` WHERE `id` IN ('paper-towels', 'tissues', 'toilet-paper', 'toothpaste', 'shampoo');--> statement-breakpoint
-- 美妆护肤子类 → beauty
UPDATE `transactions` SET `category_id` = 'beauty' WHERE `category_id` IN ('skincare', 'makeup', 'face-wash');--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'beauty' WHERE `category_id` IN ('skincare', 'makeup', 'face-wash');--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'beauty' WHERE `category_id` IN ('skincare', 'makeup', 'face-wash');--> statement-breakpoint
DELETE FROM `categories` WHERE `id` IN ('skincare', 'makeup', 'face-wash');--> statement-breakpoint
-- ready-meal（外食/简餐）→ dining
UPDATE `transactions` SET `category_id` = 'dining' WHERE `category_id` = 'ready-meal';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'dining' WHERE `category_id` = 'ready-meal';--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'dining' WHERE `category_id` = 'ready-meal';--> statement-breakpoint
DELETE FROM `categories` WHERE `id` = 'ready-meal';--> statement-breakpoint
-- iCloud（订阅下唯一子类）→ subscription
UPDATE `transactions` SET `category_id` = 'subscription' WHERE `category_id` = 'iCloud';--> statement-breakpoint
UPDATE `quick_entry_templates` SET `category_id` = 'subscription' WHERE `category_id` = 'iCloud';--> statement-breakpoint
UPDATE `recurring_items` SET `category_id` = 'subscription' WHERE `category_id` = 'iCloud';--> statement-breakpoint
DELETE FROM `categories` WHERE `id` = 'iCloud';

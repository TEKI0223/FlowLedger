ALTER TABLE `accounts` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `transactions` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `quick_entry_templates` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `credit_cards` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `recurring_items` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `refund_trackers` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';--> statement-breakpoint
ALTER TABLE `installment_plans` ADD `owner_user_id` text NOT NULL DEFAULT 'legacy';

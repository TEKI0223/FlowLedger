ALTER TABLE `recurring_items` ADD `frequency` text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_items` ADD `note` text;--> statement-breakpoint
ALTER TABLE `recurring_items` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_item_id` text;
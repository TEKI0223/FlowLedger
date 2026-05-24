ALTER TABLE `payment_methods` ADD `type` text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `currency` text DEFAULT 'JPY' NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `note` text;
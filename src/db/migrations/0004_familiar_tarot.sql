CREATE TABLE `push_reminder_deliveries` (
	`owner_user_id` text NOT NULL,
	`reminder_key` text NOT NULL,
	`stage` text NOT NULL,
	`sent_at` text NOT NULL,
	PRIMARY KEY(`owner_user_id`, `reminder_key`, `stage`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);
ALTER TABLE `refund_trackers` ADD `received_amount_minor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `refund_tracker_id` text;
ALTER TABLE `quick_entry_templates` ADD `usage_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quick_entry_templates` ADD `last_used_at` text;
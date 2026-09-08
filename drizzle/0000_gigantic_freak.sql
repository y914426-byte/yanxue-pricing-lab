CREATE TABLE `estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`plan_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_estimates_owner_created` ON `estimates` (`owner_id`,`created_at`,`id`);
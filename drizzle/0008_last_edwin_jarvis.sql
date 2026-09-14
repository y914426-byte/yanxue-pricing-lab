CREATE TABLE `activity_alias_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`activity_name` text NOT NULL,
	`normalized_activity_name` text NOT NULL,
	`candidate_name` text NOT NULL,
	`normalized_candidate_name` text NOT NULL,
	`decision` text,
	`source` text DEFAULT 'deterministic' NOT NULL,
	`confidence` real,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_alias_feedback_owner_pair` ON `activity_alias_feedback` (`owner_id`,`normalized_activity_name`,`normalized_candidate_name`);--> statement-breakpoint
CREATE INDEX `idx_activity_alias_feedback_owner_activity` ON `activity_alias_feedback` (`owner_id`,`normalized_activity_name`,`decision`);
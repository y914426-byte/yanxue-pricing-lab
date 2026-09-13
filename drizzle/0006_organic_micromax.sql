CREATE TABLE `scheme_cost_estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`scheme_document_id` text NOT NULL,
	`scheme_analysis_id` text NOT NULL,
	`price_source` text NOT NULL,
	`match_json` text NOT NULL,
	`known_cost_total` real NOT NULL,
	`unresolved_count` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scheme_cost_estimates_owner_scheme_updated` ON `scheme_cost_estimates` (`owner_id`,`scheme_document_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_scheme_cost_estimates_owner_analysis_created` ON `scheme_cost_estimates` (`owner_id`,`scheme_analysis_id`,`created_at`);

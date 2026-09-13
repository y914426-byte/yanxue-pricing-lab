CREATE TABLE `scheme_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`scheme_document_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`analysis_json` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`source_text_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scheme_analyses_owner_document_created` ON `scheme_analyses` (`owner_id`,`scheme_document_id`,`created_at`);
CREATE TABLE `scheme_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`raw_text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scheme_documents_owner_created` ON `scheme_documents` (`owner_id`,`created_at`,`id`);
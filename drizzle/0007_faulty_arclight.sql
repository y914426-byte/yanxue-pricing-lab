CREATE TABLE `activity_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`alias_name` text NOT NULL,
	`normalized_alias_name` text NOT NULL,
	`canonical_name` text NOT NULL,
	`normalized_canonical_name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_aliases_owner_alias` ON `activity_aliases` (`owner_id`,`normalized_alias_name`);--> statement-breakpoint
CREATE INDEX `idx_activity_aliases_owner_canonical` ON `activity_aliases` (`owner_id`,`normalized_canonical_name`);--> statement-breakpoint
CREATE TABLE `activity_cost_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`activity_name` text NOT NULL,
	`normalized_activity_name` text NOT NULL,
	`group_type` text DEFAULT '' NOT NULL,
	`cost_name` text NOT NULL,
	`normalized_cost_name` text NOT NULL,
	`category` text NOT NULL,
	`billing_hint` text NOT NULL,
	`requiredness` text NOT NULL,
	`confidence_score` real DEFAULT 0 NOT NULL,
	`positive_count` integer DEFAULT 0 NOT NULL,
	`negative_count` integer DEFAULT 0 NOT NULL,
	`is_disabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_cost_templates_owner_relation` ON `activity_cost_templates` (`owner_id`,`normalized_activity_name`,`normalized_cost_name`,`group_type`);--> statement-breakpoint
CREATE INDEX `idx_activity_cost_templates_owner_activity` ON `activity_cost_templates` (`owner_id`,`normalized_activity_name`,`positive_count`);--> statement-breakpoint
CREATE TABLE `cost_price_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`cost_name` text NOT NULL,
	`normalized_cost_name` text NOT NULL,
	`price_item_id` text NOT NULL,
	`positive_count` integer DEFAULT 0 NOT NULL,
	`negative_count` integer DEFAULT 0 NOT NULL,
	`is_disabled` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cost_price_aliases_owner_relation` ON `cost_price_aliases` (`owner_id`,`normalized_cost_name`,`price_item_id`);--> statement-breakpoint
CREATE INDEX `idx_cost_price_aliases_owner_cost` ON `cost_price_aliases` (`owner_id`,`normalized_cost_name`);--> statement-breakpoint
CREATE TABLE `scheme_confirmed_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`scheme_document_id` text NOT NULL,
	`scheme_analysis_id` text NOT NULL,
	`scheme_cost_estimate_id` text NOT NULL,
	`confirmation_batch_id` text NOT NULL,
	`item_key` text NOT NULL,
	`activity_name` text NOT NULL,
	`normalized_activity_name` text NOT NULL,
	`cost_name` text NOT NULL,
	`normalized_cost_name` text NOT NULL,
	`category` text NOT NULL,
	`billing_hint` text NOT NULL,
	`requiredness` text NOT NULL,
	`group_type` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`price_item_id` text,
	`quantity` real,
	`unit` text,
	`adopted` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`confirmed_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_scheme_confirmed_costs_owner_batch` ON `scheme_confirmed_costs` (`owner_id`,`confirmation_batch_id`);--> statement-breakpoint
CREATE INDEX `idx_scheme_confirmed_costs_owner_scheme` ON `scheme_confirmed_costs` (`owner_id`,`scheme_document_id`,`confirmed_at`);--> statement-breakpoint
CREATE TABLE `scheme_learning_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`scheme_document_id` text NOT NULL,
	`scheme_analysis_id` text NOT NULL,
	`scheme_cost_estimate_id` text NOT NULL,
	`learning_batch_id` text NOT NULL,
	`item_key` text NOT NULL,
	`action` text NOT NULL,
	`activity_name` text NOT NULL,
	`normalized_activity_name` text NOT NULL,
	`original_cost_name` text NOT NULL,
	`final_cost_name` text NOT NULL,
	`normalized_cost_name` text NOT NULL,
	`category` text NOT NULL,
	`billing_hint` text NOT NULL,
	`requiredness` text NOT NULL,
	`group_type` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`price_item_id` text,
	`quantity` real,
	`unit` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_scheme_learning_feedback_owner_batch` ON `scheme_learning_feedback` (`owner_id`,`learning_batch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_scheme_learning_feedback_owner_relation` ON `scheme_learning_feedback` (`owner_id`,`normalized_activity_name`,`normalized_cost_name`);--> statement-breakpoint
CREATE INDEX `idx_scheme_learning_feedback_owner_scheme` ON `scheme_learning_feedback` (`owner_id`,`scheme_document_id`,`created_at`);

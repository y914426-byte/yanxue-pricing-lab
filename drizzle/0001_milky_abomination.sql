CREATE TABLE `account_links` (
	`legacy_owner` text PRIMARY KEY NOT NULL,
	`google_owner` text NOT NULL,
	`linked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_account_links_google_owner` ON `account_links` (`google_owner`);--> statement-breakpoint
CREATE TABLE `google_challenges` (
	`nonce_hash` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_google_challenges_expiry` ON `google_challenges` (`expires_at`);--> statement-breakpoint
CREATE TABLE `google_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_google_sessions_expiry` ON `google_sessions` (`expires_at`);
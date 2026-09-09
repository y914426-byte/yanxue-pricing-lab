CREATE TABLE `price_catalogs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_price_catalogs_owner_source` ON `price_catalogs` (`owner_id`,`source`,`updated_at`);
--> statement-breakpoint
CREATE TABLE `price_items` (
	`id` text PRIMARY KEY NOT NULL,
	`catalog_id` text NOT NULL,
	`group_type` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`mode` text NOT NULL,
	`amount` real NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`capacity` integer DEFAULT 1 NOT NULL,
	`min_people` integer DEFAULT 0 NOT NULL,
	`max_people` integer DEFAULT 10000 NOT NULL,
	`actual_only` integer DEFAULT 0 NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_price_items_catalog_group` ON `price_items` (`catalog_id`,`group_type`,`sort_order`);

ALTER TABLE `price_catalogs` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `price_catalogs` ADD `import_hash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `price_items` ADD `project_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `price_items` ADD `valid_from` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `price_items` ADD `valid_to` text DEFAULT '' NOT NULL;
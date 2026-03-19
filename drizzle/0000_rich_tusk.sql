CREATE TABLE `register` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`age` integer NOT NULL,
	`phone_telegram` text NOT NULL,
	`facebook_tiktok` text NOT NULL,
	`liked_pages` integer DEFAULT false NOT NULL,
	`joined_groups` integer DEFAULT false NOT NULL,
	`agreed_terms` integer DEFAULT false NOT NULL,
	`scanned` integer DEFAULT false NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);
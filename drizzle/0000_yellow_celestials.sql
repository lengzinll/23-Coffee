CREATE TABLE `challenge` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `challenge_score` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`register_id` integer NOT NULL,
	`challenge_id` integer NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`register_id`) REFERENCES `register`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenge`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`date` integer NOT NULL,
	`status` text DEFAULT 'inactive' NOT NULL,
	`location_id` integer,
	`created_at` integer,
	FOREIGN KEY (`location_id`) REFERENCES `location`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `location` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`map_url` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `register` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`age` text NOT NULL,
	`phone` text NOT NULL,
	`agreed_terms` integer DEFAULT false NOT NULL,
	`scanned` integer DEFAULT false NOT NULL,
	`social_proofs` text,
	`position` text,
	`profile_image` text,
	`player_id` text,
	`event_id` integer,
	`total_score` integer DEFAULT 0,
	`is_live` integer DEFAULT false,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `social_media_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`label` text,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
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
CREATE TABLE `scan_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`register_id` integer,
	`timestamp` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`register_id`) REFERENCES `register`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "early_access_signup" (
	"id" text PRIMARY KEY NOT NULL,
	"account" text NOT NULL,
	"email" text NOT NULL,
	"frequency" text,
	"pain_point" text,
	"wants_beta" boolean DEFAULT false NOT NULL,
	"notification_status" "notification_status" DEFAULT 'pending' NOT NULL,
	"notification_attempted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"ip_hash" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limit_bucket_ip_hash_window_start_pk" PRIMARY KEY("ip_hash","window_start")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "early_access_signup_email_uidx" ON "early_access_signup" USING btree ("email");
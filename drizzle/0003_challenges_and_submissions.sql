CREATE TYPE "public"."challenge_status" AS ENUM('draft', 'active');--> statement-breakpoint
CREATE TYPE "public"."mention_result" AS ENUM('verified', 'not_verified');--> statement-breakpoint
CREATE TYPE "public"."processing_status" AS ENUM('pending', 'completed', 'error_permanent');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('unreviewed', 'selected', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sync_run_status" AS ENUM('running', 'completed', 'partial', 'error');--> statement-breakpoint
CREATE TABLE "challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"hashtag" text NOT NULL,
	"hashtag_id" text,
	"required_mention" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"timezone" text NOT NULL,
	"status" "challenge_status" DEFAULT 'draft' NOT NULL,
	"daily_processing_capacity" integer,
	"processing_grace_period_hours" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_daily_processing_capacity_nonneg" CHECK ("challenge"."daily_processing_capacity" IS NULL OR "challenge"."daily_processing_capacity" >= 0),
	CONSTRAINT "challenge_grace_period_nonneg" CHECK ("challenge"."processing_grace_period_hours" >= 0)
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"media_id" text NOT NULL,
	"permalink" text,
	"caption" text,
	"creator_username" text,
	"media_type" text,
	"media_url" text,
	"thumbnail_url" text,
	"published_at" timestamp NOT NULL,
	"challenge_local_day" date NOT NULL,
	"allocation_rank" double precision DEFAULT random() NOT NULL,
	"processing_status" "processing_status" DEFAULT 'pending' NOT NULL,
	"mention_result" "mention_result",
	"processing_checked_at" timestamp,
	"last_attempted_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"date_eligible" boolean DEFAULT false NOT NULL,
	"review_status" "review_status" DEFAULT 'unreviewed' NOT NULL,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submission_retry_count_nonneg" CHECK ("submission"."retry_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sync_run" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"status" "sync_run_status" DEFAULT 'running' NOT NULL,
	"cursor" text,
	"pages_scanned" integer DEFAULT 0 NOT NULL,
	"items_scanned" integer DEFAULT 0 NOT NULL,
	"new_candidates" integer DEFAULT 0 NOT NULL,
	"existing_candidates" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "sync_lease" (
	"challenge_id" text PRIMARY KEY NOT NULL,
	"locked_until" timestamp NOT NULL,
	"locked_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_budget" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge_id" text NOT NULL,
	"local_day" date NOT NULL,
	"capacity" integer,
	"consumed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processing_budget_capacity_nonneg" CHECK ("processing_budget"."capacity" IS NULL OR "processing_budget"."capacity" >= 0),
	CONSTRAINT "processing_budget_consumed_nonneg" CHECK ("processing_budget"."consumed" >= 0)
);
--> statement-breakpoint
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_run" ADD CONSTRAINT "sync_run_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_lease" ADD CONSTRAINT "sync_lease_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_budget" ADD CONSTRAINT "processing_budget_challenge_id_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_organization_id_idx" ON "challenge" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_challenge_media_uidx" ON "submission" USING btree ("challenge_id","media_id");--> statement-breakpoint
CREATE INDEX "submission_challenge_id_idx" ON "submission" USING btree ("challenge_id");--> statement-breakpoint
CREATE INDEX "submission_challenge_published_idx" ON "submission" USING btree ("challenge_id","published_at");--> statement-breakpoint
CREATE INDEX "submission_challenge_local_day_idx" ON "submission" USING btree ("challenge_id","challenge_local_day");--> statement-breakpoint
CREATE INDEX "submission_challenge_processing_status_idx" ON "submission" USING btree ("challenge_id","processing_status");--> statement-breakpoint
CREATE INDEX "sync_run_challenge_id_idx" ON "sync_run" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "processing_budget_challenge_local_day_uidx" ON "processing_budget" USING btree ("challenge_id","local_day");
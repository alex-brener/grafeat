ALTER TABLE "challenge" ADD COLUMN "daily_review_limit" integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "sampled_for_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenge" ADD CONSTRAINT "challenge_daily_review_limit_range" CHECK ("challenge"."daily_review_limit" BETWEEN 50 AND 500);
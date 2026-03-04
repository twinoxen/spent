ALTER TABLE "accounts" ADD COLUMN "current_balance" double precision;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "balance_as_of_date" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "credit_limit" double precision;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "apr" double precision;
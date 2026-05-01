CREATE TABLE IF NOT EXISTS "reserves" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"name" text NOT NULL,
	"target_amount" double precision NOT NULL,
	"current_reserved_amount" double precision DEFAULT 0 NOT NULL,
	"contribution_amount" double precision DEFAULT 0 NOT NULL,
	"contribution_cadence" text DEFAULT 'monthly' NOT NULL,
	"actual_payment_cadence" text DEFAULT 'monthly' NOT NULL,
	"next_due_date" text NOT NULL,
	"category" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"last_accrued_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reserves" ADD CONSTRAINT "reserves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reserves" ADD CONSTRAINT "reserves_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reserves_user_id_idx" ON "reserves" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reserves_account_id_idx" ON "reserves" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reserves_status_idx" ON "reserves" USING btree ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reserve_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"reserve_id" integer NOT NULL,
	"date" text NOT NULL,
	"amount" double precision NOT NULL,
	"type" text NOT NULL,
	"linked_transaction_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reserve_movements" ADD CONSTRAINT "reserve_movements_reserve_id_reserves_id_fk" FOREIGN KEY ("reserve_id") REFERENCES "public"."reserves"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reserve_movements" ADD CONSTRAINT "reserve_movements_linked_transaction_id_transactions_id_fk" FOREIGN KEY ("linked_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reserve_movements_reserve_id_idx" ON "reserve_movements" USING btree ("reserve_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reserve_movements_linked_transaction_id_idx" ON "reserve_movements" USING btree ("linked_transaction_id");

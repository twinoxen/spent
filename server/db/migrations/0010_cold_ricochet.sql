CREATE TABLE IF NOT EXISTS "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"amount" double precision NOT NULL,
	"occurrence" text DEFAULT 'monthly' NOT NULL,
	"due_date" text NOT NULL,
	"is_end_of_month" boolean DEFAULT false NOT NULL,
	"spread_monthly" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bills" ADD CONSTRAINT "bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bills_user_id_idx" ON "bills" USING btree ("user_id");

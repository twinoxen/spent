CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'credit_card' NOT NULL,
	"institution" text,
	"last_four" text,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "import_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"filename" text NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	"row_count" integer NOT NULL,
	"source_type" text DEFAULT 'apple_card' NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pattern" text NOT NULL,
	"category_id" integer NOT NULL,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"normalized_name" text NOT NULL,
	"raw_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staging_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"import_session_id" integer NOT NULL,
	"transaction_date" text NOT NULL,
	"clearing_date" text,
	"description" text NOT NULL,
	"merchant_name" text DEFAULT '' NOT NULL,
	"source_category" text,
	"amount" double precision NOT NULL,
	"type" text NOT NULL,
	"purchased_by" text,
	"fingerprint" text NOT NULL,
	"category_id" integer,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"is_selected" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"transaction_date" text NOT NULL,
	"clearing_date" text,
	"description" text NOT NULL,
	"merchant_id" integer,
	"category_id" integer,
	"type" text NOT NULL,
	"amount" double precision NOT NULL,
	"purchased_by" text,
	"source_file" text,
	"fingerprint" text NOT NULL,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_duplicate_flagged" boolean DEFAULT false,
	"import_session_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "transactions_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_transactions" ADD CONSTRAINT "staging_transactions_import_session_id_import_sessions_id_fk" FOREIGN KEY ("import_session_id") REFERENCES "public"."import_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staging_transactions" ADD CONSTRAINT "staging_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_session_id_import_sessions_id_fk" FOREIGN KEY ("import_session_id") REFERENCES "public"."import_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "import_sessions_imported_at_idx" ON "import_sessions" USING btree ("imported_at");--> statement-breakpoint
CREATE INDEX "import_sessions_account_id_idx" ON "import_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_user_id_idx" ON "merchant_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_category_id_idx" ON "merchant_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "merchant_rules_priority_idx" ON "merchant_rules" USING btree ("priority");--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_normalized_name_user_idx" ON "merchants" USING btree ("normalized_name","user_id");--> statement-breakpoint
CREATE INDEX "staging_transactions_import_session_id_idx" ON "staging_transactions" USING btree ("import_session_id");--> statement-breakpoint
CREATE INDEX "transactions_fingerprint_idx" ON "transactions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "transactions_transaction_date_idx" ON "transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "transactions_merchant_id_idx" ON "transactions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_import_session_id_idx" ON "transactions" USING btree ("import_session_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");
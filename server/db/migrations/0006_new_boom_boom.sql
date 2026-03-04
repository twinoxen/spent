CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"jti" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_tokens_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_tokens_jti_idx" ON "api_tokens" USING btree ("jti");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mcp_token_jti";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mcp_token_issued_at";
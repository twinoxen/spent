ALTER TABLE "transactions" ADD COLUMN "is_opening_balance" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_one_opening_balance_per_account_idx" ON "transactions" ("account_id") WHERE "is_opening_balance" = true;
--> statement-breakpoint
INSERT INTO "transactions" (
  "account_id",
  "transaction_date",
  "description",
  "type",
  "amount",
  "source_file",
  "fingerprint",
  "is_opening_balance"
)
SELECT
  a."id" AS "account_id",
  COALESCE(a."balance_as_of_date", to_char(CURRENT_DATE, 'YYYY-MM-DD')) AS "transaction_date",
  'Opening Balance' AS "description",
  'Opening Balance' AS "type",
  CASE
    WHEN a."type" = 'credit_card' THEN -ABS(a."current_balance")
    ELSE a."current_balance"
  END AS "amount",
  'system' AS "source_file",
  'opening-balance-' || a."id" AS "fingerprint",
  true AS "is_opening_balance"
FROM "accounts" a
WHERE a."current_balance" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "transactions" t
    WHERE t."account_id" = a."id"
      AND t."is_opening_balance" = true
  );

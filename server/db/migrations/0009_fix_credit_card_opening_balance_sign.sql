-- Correct legacy credit-card opening balance anchors that were stored as negative values.
-- New invariant: opening-balance transactions are stored as positive values for all account types.

UPDATE "transactions" t
SET "amount" = ABS(t."amount")
FROM "accounts" a
WHERE t."account_id" = a."id"
  AND t."is_opening_balance" = true
  AND a."type" = 'credit_card'
  AND t."amount" < 0;

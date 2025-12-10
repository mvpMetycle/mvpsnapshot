-- Add account_name field to cash_bank_balance table
ALTER TABLE public.cash_bank_balance
ADD COLUMN account_name text DEFAULT '';
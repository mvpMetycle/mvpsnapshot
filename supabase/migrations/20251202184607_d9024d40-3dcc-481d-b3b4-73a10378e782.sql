-- Safely convert down_payment_amount_percent from text to numeric
-- First, update any non-numeric values to NULL
UPDATE public.ticket
SET down_payment_amount_percent = NULL
WHERE down_payment_amount_percent IS NOT NULL 
  AND down_payment_amount_percent !~ '^[0-9]*\.?[0-9]+$';

-- Update empty strings to NULL
UPDATE public.ticket
SET down_payment_amount_percent = NULL
WHERE down_payment_amount_percent = '';

-- Now alter the column type from text to numeric
ALTER TABLE public.ticket
ALTER COLUMN down_payment_amount_percent TYPE numeric
USING down_payment_amount_percent::numeric;
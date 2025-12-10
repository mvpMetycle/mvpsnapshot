-- Create payment_type_enum
CREATE TYPE public.payment_type_enum AS ENUM ('Downpayment', 'Provisional', 'Final', 'Credit Note', 'Debit Note');

-- Normalize existing payment_type values to match enum values
UPDATE public.payment
SET payment_type = 'Downpayment'
WHERE payment_type IS NULL 
   OR payment_type NOT IN ('Downpayment', 'Provisional', 'Final', 'Credit Note', 'Debit Note');

-- Alter column to use the enum
ALTER TABLE public.payment
ALTER COLUMN payment_type TYPE public.payment_type_enum
USING payment_type::public.payment_type_enum;
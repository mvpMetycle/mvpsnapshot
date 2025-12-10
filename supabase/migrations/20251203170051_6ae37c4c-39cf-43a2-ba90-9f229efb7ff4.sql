-- Add applied_downpayment_amount field for final/provisional invoices
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS applied_downpayment_amount numeric;

-- Add adjusts_invoice_id to track which invoice a credit/debit note adjusts
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS adjusts_invoice_id bigint REFERENCES public.invoice(id);

-- Add note_reason for credit/debit notes
ALTER TABLE public.invoice 
ADD COLUMN IF NOT EXISTS note_reason text;
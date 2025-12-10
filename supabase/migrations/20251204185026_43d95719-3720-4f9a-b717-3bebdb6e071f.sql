-- Create cash_bank_balance table for tracking bank balances over time
CREATE TABLE public.cash_bank_balance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  as_of_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT '',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_bank_balance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (open for now, consistent with other tables)
CREATE POLICY "Anyone can view cash_bank_balance" 
ON public.cash_bank_balance 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert cash_bank_balance" 
ON public.cash_bank_balance 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update cash_bank_balance" 
ON public.cash_bank_balance 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete cash_bank_balance" 
ON public.cash_bank_balance 
FOR DELETE 
USING (true);

-- Add index for efficient date queries
CREATE INDEX idx_cash_bank_balance_as_of_date ON public.cash_bank_balance(as_of_date DESC);
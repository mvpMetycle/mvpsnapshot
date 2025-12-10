-- Create traders table
CREATE TABLE IF NOT EXISTS public.traders (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert traders from existing enum values
INSERT INTO public.traders (name) VALUES
  ('Velli'),
  ('Harry'),
  ('Andy'),
  ('Anton'),
  ('Armin'),
  ('Christian'),
  ('Khsitiz'),
  ('Eric')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.traders ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read traders (update as needed for your security requirements)
CREATE POLICY "Anyone can view traders" ON public.traders
  FOR SELECT
  USING (true);

-- Add foreign key constraint from ticket to traders
ALTER TABLE public.ticket 
  DROP CONSTRAINT IF EXISTS fk_ticket_trader_id;

ALTER TABLE public.ticket
  ADD CONSTRAINT fk_ticket_trader_id
  FOREIGN KEY (trader_id)
  REFERENCES public.traders(id)
  ON DELETE SET NULL;
-- Add aggregated late payment days to Company table
ALTER TABLE public."Company"
ADD COLUMN aggregated_late_payment_days integer DEFAULT 0;

COMMENT ON COLUMN public."Company".aggregated_late_payment_days IS 'Total days of late payments aggregated across all transactions';

-- Create company_notes table for team collaboration
CREATE TABLE public.company_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id bigint NOT NULL REFERENCES public."Company"(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  note_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index for faster queries
CREATE INDEX idx_company_notes_company_id ON public.company_notes(company_id);
CREATE INDEX idx_company_notes_created_at ON public.company_notes(created_at DESC);

-- Enable RLS on company_notes
ALTER TABLE public.company_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_notes (public access for now since no auth)
CREATE POLICY "Anyone can view company notes"
  ON public.company_notes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert company notes"
  ON public.company_notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update company notes"
  ON public.company_notes
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete company notes"
  ON public.company_notes
  FOR DELETE
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_company_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_notes_updated_at
  BEFORE UPDATE ON public.company_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_notes_updated_at();
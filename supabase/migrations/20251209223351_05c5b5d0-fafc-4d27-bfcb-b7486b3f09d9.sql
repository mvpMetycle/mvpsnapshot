-- Create invoice_comments table for audit trail
CREATE TABLE public.invoice_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id BIGINT NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view invoice comments"
  ON public.invoice_comments FOR SELECT USING (true);

CREATE POLICY "Anyone can insert invoice comments"
  ON public.invoice_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update invoice comments"
  ON public.invoice_comments FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete invoice comments"
  ON public.invoice_comments FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_invoice_comments_invoice_id ON public.invoice_comments(invoice_id);
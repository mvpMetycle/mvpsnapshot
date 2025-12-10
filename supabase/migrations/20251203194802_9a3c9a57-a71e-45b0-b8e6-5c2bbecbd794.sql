-- Create enum types for claims
CREATE TYPE claim_type_enum AS ENUM ('quality', 'contamination', 'moisture', 'weight_loss', 'other');
CREATE TYPE claim_status_enum AS ENUM ('draft', 'preliminary_submitted', 'formal_submitted', 'under_supplier_review', 'accepted', 'rejected', 'counter_offer', 'settled', 'closed');
CREATE TYPE supplier_response_enum AS ENUM ('pending', 'accepted', 'rejected', 'counter_offer');

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Identification
  order_id TEXT REFERENCES public."order"(id),
  bl_order_id BIGINT REFERENCES public.bl_order(id),
  bl_order_name TEXT,
  claim_reference TEXT UNIQUE,
  
  -- Timing
  ata DATE,
  preliminary_claim_date DATE,
  formal_claim_date DATE,
  is_within_2_day_window BOOLEAN DEFAULT false,
  is_within_7_day_window BOOLEAN DEFAULT false,
  is_valid_claim BOOLEAN DEFAULT true,
  
  -- Parties
  buyer_id BIGINT REFERENCES public."Company"(id),
  supplier_id BIGINT REFERENCES public."Company"(id),
  inspection_company_id BIGINT REFERENCES public."Company"(id),
  assigned_trader_id BIGINT REFERENCES public.traders(id),
  
  -- Claim Details
  claim_type claim_type_enum NOT NULL DEFAULT 'quality',
  claim_description TEXT,
  claimed_value_currency TEXT DEFAULT 'USD',
  claimed_value_amount NUMERIC,
  commodity_type TEXT,
  
  -- Evidence (file URLs)
  buyer_evidence_files TEXT[] DEFAULT '{}',
  inspection_report_url TEXT,
  lab_results_url TEXT,
  photos_urls TEXT[] DEFAULT '{}',
  
  -- Supplier Response
  supplier_response_status supplier_response_enum DEFAULT 'pending',
  supplier_notes TEXT,
  supplier_counter_offer_amount NUMERIC,
  
  -- Internal Notes
  trader_notes TEXT,
  
  -- Settlement Data
  final_settlement_currency TEXT,
  final_settlement_amount NUMERIC,
  settlement_agreed_date DATE,
  settlement_document_url TEXT,
  
  -- Status
  status claim_status_enum NOT NULL DEFAULT 'draft'
);

-- Create function to generate claim reference
CREATE OR REPLACE FUNCTION generate_claim_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.claim_reference := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating claim reference
CREATE TRIGGER set_claim_reference
  BEFORE INSERT ON public.claims
  FOR EACH ROW
  WHEN (NEW.claim_reference IS NULL)
  EXECUTE FUNCTION generate_claim_reference();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
CREATE TRIGGER update_claims_timestamp
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION update_claims_updated_at();

-- Create function to calculate deadline windows
CREATE OR REPLACE FUNCTION calculate_claim_windows()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate 2-day window for preliminary claim
  IF NEW.ata IS NOT NULL AND NEW.preliminary_claim_date IS NOT NULL THEN
    NEW.is_within_2_day_window := (NEW.preliminary_claim_date - NEW.ata) <= 2;
  END IF;
  
  -- Calculate 7-day window for formal claim
  IF NEW.ata IS NOT NULL AND NEW.formal_claim_date IS NOT NULL THEN
    NEW.is_within_7_day_window := (NEW.formal_claim_date - NEW.ata) <= 7;
  END IF;
  
  -- Claim is valid if within windows (when applicable)
  NEW.is_valid_claim := COALESCE(NEW.is_within_2_day_window, true) AND COALESCE(NEW.is_within_7_day_window, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calculating windows
CREATE TRIGGER calculate_claim_windows_trigger
  BEFORE INSERT OR UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION calculate_claim_windows();

-- Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view claims" ON public.claims FOR SELECT USING (true);
CREATE POLICY "Anyone can insert claims" ON public.claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update claims" ON public.claims FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete claims" ON public.claims FOR DELETE USING (true);

-- Create storage bucket for claim documents
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-documents', 'claim-documents', true);

-- Create storage policies for claim documents
CREATE POLICY "Anyone can view claim documents" ON storage.objects FOR SELECT USING (bucket_id = 'claim-documents');
CREATE POLICY "Anyone can upload claim documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-documents');
CREATE POLICY "Anyone can delete claim documents" ON storage.objects FOR DELETE USING (bucket_id = 'claim-documents');

-- Create index for faster queries
CREATE INDEX idx_claims_bl_order_id ON public.claims(bl_order_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_buyer_id ON public.claims(buyer_id);
CREATE INDEX idx_claims_supplier_id ON public.claims(supplier_id);
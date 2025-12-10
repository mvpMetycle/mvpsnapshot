-- Create document_signatures table for tracking all signing requests
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pandadoc_document_id TEXT,
  document_type TEXT NOT NULL, -- 'purchase_order', 'sales_order', 'bl_document', 'company_document'
  reference_id TEXT NOT NULL,  -- Order ID, BL Order ID, Company ID, etc.
  reference_table TEXT NOT NULL, -- 'order', 'bl_order', 'company', etc.
  document_name TEXT NOT NULL,
  document_url TEXT,           -- Original document URL in Supabase storage
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, waiting_approval, completed, declined, voided
  recipients JSONB,            -- Array of recipient objects
  signing_link TEXT,           -- Embedded signing URL
  signed_document_url TEXT,    -- URL of signed document after completion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS with public access for now (matching existing patterns)
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document signatures" 
  ON document_signatures FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert document signatures" 
  ON document_signatures FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update document signatures" 
  ON document_signatures FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete document signatures" 
  ON document_signatures FOR DELETE 
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX idx_document_signatures_reference ON document_signatures(reference_table, reference_id);
CREATE INDEX idx_document_signatures_status ON document_signatures(status);
CREATE INDEX idx_document_signatures_pandadoc_id ON document_signatures(pandadoc_document_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_signatures_updated_at_trigger
  BEFORE UPDATE ON document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_document_signatures_updated_at();
-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
);

-- Create company_documents table to track uploaded files
CREATE TABLE public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id BIGINT NOT NULL REFERENCES public."Company"(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by TEXT
);

-- Enable RLS on company_documents table
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view company documents
CREATE POLICY "Anyone can view company documents"
ON public.company_documents
FOR SELECT
USING (true);

-- Policy: Anyone can insert company documents
CREATE POLICY "Anyone can insert company documents"
ON public.company_documents
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can delete company documents
CREATE POLICY "Anyone can delete company documents"
ON public.company_documents
FOR DELETE
USING (true);

-- Storage policies for company-documents bucket
-- Policy: Anyone can view files in company-documents
CREATE POLICY "Anyone can view company documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-documents');

-- Policy: Anyone can upload files to company-documents
CREATE POLICY "Anyone can upload company documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'company-documents');

-- Policy: Anyone can delete files from company-documents
CREATE POLICY "Anyone can delete company documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-documents');
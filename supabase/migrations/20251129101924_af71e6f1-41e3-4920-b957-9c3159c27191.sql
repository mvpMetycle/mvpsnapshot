-- Create storage bucket for BL PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bl-documents',
  'bl-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Create storage policies for bl-documents bucket
CREATE POLICY "Anyone can upload BL documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bl-documents');

CREATE POLICY "Anyone can view BL documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'bl-documents');

CREATE POLICY "Anyone can delete BL documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'bl-documents');
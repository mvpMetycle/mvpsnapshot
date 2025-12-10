-- Create a public storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
);

-- Enable public access to signed documents
CREATE POLICY "Public read access to signed documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signed-documents');

-- Allow authenticated users to upload signed documents
CREATE POLICY "Authenticated users can upload signed documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signed-documents');

-- Allow service role to manage signed documents
CREATE POLICY "Service role can manage signed documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'signed-documents');
-- Make existing document buckets public so stored PDFs are accessible via public URLs
UPDATE storage.buckets
SET public = true
WHERE id IN ('company-documents', 'bl-documents');
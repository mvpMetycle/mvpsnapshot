-- Create storage bucket for ticket photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-photos', 'ticket-photos', true);

-- Create ticket_photos table to track uploaded photos
CREATE TABLE public.ticket_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id BIGINT REFERENCES public.ticket(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on ticket_photos table
ALTER TABLE public.ticket_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for ticket_photos table
CREATE POLICY "Allow public read access to ticket photos"
  ON public.ticket_photos
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert of ticket photos"
  ON public.ticket_photos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete of ticket photos"
  ON public.ticket_photos
  FOR DELETE
  USING (true);

-- Storage policies for ticket-photos bucket
CREATE POLICY "Allow public read access to ticket photos in storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ticket-photos');

CREATE POLICY "Allow public upload of ticket photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'ticket-photos');

CREATE POLICY "Allow public delete of ticket photos in storage"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'ticket-photos');
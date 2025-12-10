-- Create bl_container_photos table
CREATE TABLE public.bl_container_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bl_order_id BIGINT NOT NULL REFERENCES public.bl_order(id) ON DELETE CASCADE,
  container_id BIGINT NOT NULL REFERENCES public.bl_extraction_container(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name_original TEXT NOT NULL,
  content_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.bl_container_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access for now, matching other tables)
CREATE POLICY "Anyone can view container photos" 
ON public.bl_container_photos 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert container photos" 
ON public.bl_container_photos 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete container photos" 
ON public.bl_container_photos 
FOR DELETE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_bl_container_photos_bl_order_id ON public.bl_container_photos(bl_order_id);
CREATE INDEX idx_bl_container_photos_container_id ON public.bl_container_photos(container_id);

-- Create storage bucket for container photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('container-photos', 'container-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Anyone can view container photos storage" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'container-photos');

CREATE POLICY "Anyone can upload container photos storage" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'container-photos');

CREATE POLICY "Anyone can delete container photos storage" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'container-photos');
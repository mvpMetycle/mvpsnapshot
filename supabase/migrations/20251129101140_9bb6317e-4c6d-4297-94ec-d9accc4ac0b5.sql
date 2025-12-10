-- Add bl_order_id foreign key to bl_extraction table
ALTER TABLE public.bl_extraction
ADD COLUMN bl_order_id bigint REFERENCES public.bl_order(id) ON DELETE CASCADE;

-- Add bl_order_id foreign key to bl_extraction_container table
ALTER TABLE public.bl_extraction_container
ADD COLUMN bl_order_id bigint REFERENCES public.bl_order(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_bl_extraction_bl_order_id ON public.bl_extraction(bl_order_id);
CREATE INDEX idx_bl_extraction_container_bl_order_id ON public.bl_extraction_container(bl_order_id);
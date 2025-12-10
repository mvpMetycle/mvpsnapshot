-- Add loading_date column to bl_extraction table
ALTER TABLE public.bl_extraction 
ADD COLUMN loading_date date NULL;
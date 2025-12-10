-- First, delete duplicate bl_order_id entries, keeping only the most recent one
DELETE FROM bl_extraction a
USING bl_extraction b
WHERE a.bl_order_id = b.bl_order_id
  AND a.bl_order_id IS NOT NULL
  AND a.id < b.id;

-- Now add the unique constraint
ALTER TABLE bl_extraction
ADD CONSTRAINT bl_extraction_bl_order_id_key UNIQUE (bl_order_id);
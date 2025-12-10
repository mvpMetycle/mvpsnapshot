-- Drop problematic foreign key constraints that are preventing bl_extraction inserts
-- These are legacy constraints from before bl_order_id was added
-- The proper linkage is now handled by bl_order_id foreign keys

ALTER TABLE bl_extraction 
DROP CONSTRAINT IF EXISTS bl_extraction_bl_number_fkey;

ALTER TABLE bl_extraction 
DROP CONSTRAINT IF EXISTS bl_extraction_bl_order_name_fkey;
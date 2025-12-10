-- Remove incorrect unique constraint on bl_number that prevents multiple containers per BL
-- Each BL should be allowed to have multiple containers
ALTER TABLE bl_extraction_container DROP CONSTRAINT IF EXISTS bl_extraction_container_bl_number_key;

-- Also remove from bl_extraction if it exists there
ALTER TABLE bl_extraction DROP CONSTRAINT IF EXISTS bl_extraction_bl_number_key;

-- Add a comment for clarity
COMMENT ON COLUMN bl_extraction_container.bl_number IS 'BL number - multiple containers can share the same BL number';
-- Update existing allocated BL orders that don't have a bl_order_name
-- Give them a name based on their order_id and a unique identifier
UPDATE bl_order 
SET bl_order_name = order_id || '-' || COALESCE(bl_number, 'BL' || id)
WHERE order_id IS NOT NULL AND bl_order_name IS NULL;
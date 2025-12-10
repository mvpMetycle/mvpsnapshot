-- Clear bl_order_name for unmapped BL orders (Unknown category)
-- These BL orders should only have names after allocation to orders
UPDATE bl_order 
SET bl_order_name = NULL 
WHERE order_id IS NULL;
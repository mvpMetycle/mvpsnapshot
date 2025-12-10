-- Link existing BL extraction data to BL orders based on BL number matches

-- Update extraction record for HLCUBSC2411AVPR3
UPDATE bl_extraction 
SET bl_order_id = 9 
WHERE bl_number = 'HLCUBSC2411AVPR3' AND bl_order_id IS NULL;

-- Update container records for HLCUBSC2411AVPR3
UPDATE bl_extraction_container 
SET bl_order_id = 9 
WHERE bl_number = 'HLCUBSC2411AVPR3' AND bl_order_id IS NULL;

-- Update extraction record for GOSUDAR80000827 (matches GOSUDAR8000827 closely)
UPDATE bl_extraction 
SET bl_order_id = 7 
WHERE bl_number = 'GOSUDAR80000827' AND bl_order_id IS NULL;

-- Update container records for GOSUDAR80000827
UPDATE bl_extraction_container 
SET bl_order_id = 7 
WHERE bl_number = 'GOSUDAR80000827' AND bl_order_id IS NULL;
-- Create bl_order for unlinked extraction
INSERT INTO bl_order (bl_order_name, bl_number, status)
VALUES ('908908', '908908', 'Draft');

-- Link the unlinked bl_extraction record
UPDATE bl_extraction 
SET bl_order_id = (SELECT id FROM bl_order WHERE bl_number = '908908' ORDER BY id DESC LIMIT 1)
WHERE bl_number = '908908' AND bl_order_id IS NULL;
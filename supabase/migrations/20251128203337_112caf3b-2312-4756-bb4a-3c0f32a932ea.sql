-- Drop the existing foreign key constraint
ALTER TABLE planned_shipment 
DROP CONSTRAINT IF EXISTS planned_shipments_order_id_fkey;

-- Convert order_id column from text to bigint
ALTER TABLE planned_shipment 
ALTER COLUMN order_id TYPE bigint USING order_id::bigint;

-- Add new foreign key constraint pointing to ticket table
ALTER TABLE planned_shipment
ADD CONSTRAINT planned_shipment_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES ticket(id) 
ON DELETE CASCADE;
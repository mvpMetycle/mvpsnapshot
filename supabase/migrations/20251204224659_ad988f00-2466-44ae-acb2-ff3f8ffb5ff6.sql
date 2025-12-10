-- Add 'Price_Fix' to hedge_request_source enum
ALTER TYPE hedge_request_source ADD VALUE IF NOT EXISTS 'Price_Fix';

-- Add linked_execution_id to hedge_request table for price fix linking
ALTER TABLE hedge_request 
ADD COLUMN IF NOT EXISTS linked_execution_id uuid REFERENCES hedge_execution(id);

-- Add bl_order_id to hedge_request for BL-level price fixing
ALTER TABLE hedge_request 
ADD COLUMN IF NOT EXISTS bl_order_id bigint REFERENCES bl_order(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hedge_request_linked_execution ON hedge_request(linked_execution_id) WHERE linked_execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hedge_request_bl_order ON hedge_request(bl_order_id) WHERE bl_order_id IS NOT NULL;
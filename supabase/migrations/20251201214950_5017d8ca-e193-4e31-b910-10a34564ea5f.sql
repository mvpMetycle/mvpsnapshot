-- Add transaction_type field to order table to distinguish B2B from Inventory orders
ALTER TABLE "order" ADD COLUMN transaction_type TEXT DEFAULT 'B2B';

-- Update existing orders to set appropriate transaction_type
-- Orders with both buyer and seller are B2B
UPDATE "order" SET transaction_type = 'B2B' WHERE buyer IS NOT NULL AND seller IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN "order".transaction_type IS 'Order type: B2B (matched buy/sell tickets) or Inventory (warehouse movements)';
-- Add default timestamp to ticket created_at field
ALTER TABLE ticket 
ALTER COLUMN created_at SET DEFAULT NOW();
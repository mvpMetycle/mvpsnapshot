-- Add three new columns to the claims table

-- 1. 3rd Party inspection costs (numeric) - only relevant when external_inspection_provided = true
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS third_party_inspection_costs NUMERIC;

-- 2. Raised to Supplier flag (boolean)
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS raised_to_supplier BOOLEAN DEFAULT false;

-- 3. Way of Settling (text with allowed values)
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS way_of_settling TEXT;

-- Add a comment to document the allowed values for way_of_settling
COMMENT ON COLUMN public.claims.way_of_settling IS 'Allowed values: Settled via Supplier, Settled via own cash';
-- First rename the old enum
ALTER TYPE public.hedge_direction RENAME TO hedge_direction_old;

-- Create new enum with Buy/Sell values
CREATE TYPE public.hedge_direction AS ENUM ('Buy', 'Sell');

-- Update hedge_request column with value mapping
ALTER TABLE public.hedge_request 
  ALTER COLUMN direction TYPE public.hedge_direction 
  USING (CASE direction::text WHEN 'Long' THEN 'Buy' WHEN 'Short' THEN 'Sell' ELSE direction::text END)::public.hedge_direction;

-- Update hedge_execution column with value mapping
ALTER TABLE public.hedge_execution 
  ALTER COLUMN direction TYPE public.hedge_direction 
  USING (CASE direction::text WHEN 'Long' THEN 'Buy' WHEN 'Short' THEN 'Sell' ELSE direction::text END)::public.hedge_direction;

-- Drop old enum
DROP TYPE public.hedge_direction_old;
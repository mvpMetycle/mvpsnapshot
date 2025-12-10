
-- Add columns to pricing_fixing for hedge fixing workflow
ALTER TABLE public.pricing_fixing 
ADD COLUMN IF NOT EXISTS level text CHECK (level IN ('ORDER', 'BL_ORDER', 'TICKET')),
ADD COLUMN IF NOT EXISTS order_id text,
ADD COLUMN IF NOT EXISTS bl_order_id bigint,
ADD COLUMN IF NOT EXISTS quantity_mt numeric;

-- Add open_quantity_mt to hedge_execution for tracking unfixed quantity
ALTER TABLE public.hedge_execution
ADD COLUMN IF NOT EXISTS open_quantity_mt numeric;

-- Initialize open_quantity_mt with quantity_mt for existing rows
UPDATE public.hedge_execution 
SET open_quantity_mt = quantity_mt 
WHERE open_quantity_mt IS NULL;

-- Add fixing-related columns to hedge_link
ALTER TABLE public.hedge_link
ADD COLUMN IF NOT EXISTS exec_price numeric,
ADD COLUMN IF NOT EXISTS fixing_price numeric,
ADD COLUMN IF NOT EXISTS fixing_id uuid REFERENCES public.pricing_fixing(id),
ADD COLUMN IF NOT EXISTS metal text,
ADD COLUMN IF NOT EXISTS direction text;

-- Add rolled_qty_mt to hedge_roll
ALTER TABLE public.hedge_roll
ADD COLUMN IF NOT EXISTS rolled_qty_mt numeric;

-- Add foreign key constraints for pricing_fixing
ALTER TABLE public.pricing_fixing
ADD CONSTRAINT pricing_fixing_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public."order"(id) ON DELETE SET NULL;

ALTER TABLE public.pricing_fixing
ADD CONSTRAINT pricing_fixing_bl_order_id_fkey 
FOREIGN KEY (bl_order_id) REFERENCES public.bl_order(id) ON DELETE SET NULL;

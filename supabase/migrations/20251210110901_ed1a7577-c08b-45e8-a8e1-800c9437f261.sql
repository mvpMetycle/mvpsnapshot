-- 1. Create new enums for hedge request

-- Hedge instrument type enum (replaces the limited hedge_instrument)
CREATE TYPE public.hedge_instrument_type AS ENUM (
  'FUTURE',
  'OPTION',
  'FX'
);

-- Hedge request reason enum
CREATE TYPE public.hedge_request_reason AS ENUM (
  'PHYSICAL_SALE_PRICING',
  'UNPRICING',
  'PRE_LENDING',
  'PRE_BORROWING',
  'ROLL',
  'PRICE_FIX'
);

-- Hedge metal type enum (tradable base metals for hedging)
CREATE TYPE public.hedge_metal_type AS ENUM (
  'COPPER',
  'ALUMINIUM',
  'ZINC',
  'NICKEL',
  'LEAD',
  'TIN'
);

-- 2. Add new columns to hedge_request table
ALTER TABLE public.hedge_request
ADD COLUMN IF NOT EXISTS instrument_type public.hedge_instrument_type DEFAULT 'FUTURE',
ADD COLUMN IF NOT EXISTS reason public.hedge_request_reason,
ADD COLUMN IF NOT EXISTS pricing_type text,
ADD COLUMN IF NOT EXISTS formula_percent numeric,
ADD COLUMN IF NOT EXISTS estimated_qp_month date,
ADD COLUMN IF NOT EXISTS hedge_metal public.hedge_metal_type;

-- Add comments for documentation
COMMENT ON COLUMN public.hedge_request.instrument_type IS 'Type of hedge instrument: FUTURE, OPTION, or FX';
COMMENT ON COLUMN public.hedge_request.reason IS 'Business reason for the hedge request';
COMMENT ON COLUMN public.hedge_request.pricing_type IS 'Copied from ticket.pricing_type (Index, Formula, Fixed)';
COMMENT ON COLUMN public.hedge_request.formula_percent IS 'Copied from ticket.payable_percent as decimal 0-1';
COMMENT ON COLUMN public.hedge_request.estimated_qp_month IS 'First day of the estimated QP month (e.g., 2025-03-01 for March 2025)';
COMMENT ON COLUMN public.hedge_request.hedge_metal IS 'Tradable base metal for hedging purposes';
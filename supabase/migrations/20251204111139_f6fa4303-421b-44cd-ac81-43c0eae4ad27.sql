-- 1. pricing_fixing: ticket-level price fixes with QP period
CREATE TABLE IF NOT EXISTS public.pricing_fixing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ticket_id bigint REFERENCES public.ticket(id) ON DELETE CASCADE,
  metal commodity_type_enum NOT NULL,
  reference reference_type NOT NULL DEFAULT 'LME_CASH',
  qp_start date,
  qp_end date,
  premium_discount numeric,
  premium_discount_currency text DEFAULT 'USD',
  final_price numeric,
  final_price_currency text DEFAULT 'USD',
  fixed_at timestamptz,
  notes text,
  deleted_at timestamptz,
  delete_reason text
);

-- 2. hedge_request: physical exposure hedging intent
CREATE TABLE IF NOT EXISTS public.hedge_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ticket_id bigint REFERENCES public.ticket(id) ON DELETE SET NULL,
  order_id text,
  metal commodity_type_enum NOT NULL,
  direction hedge_direction NOT NULL,
  quantity_mt numeric NOT NULL,
  reference reference_type NOT NULL DEFAULT 'LME_CASH',
  target_price numeric,
  target_price_currency text DEFAULT 'USD',
  source hedge_request_source NOT NULL DEFAULT 'Manual',
  status hedge_request_status NOT NULL DEFAULT 'Draft',
  broker_preference text,
  requested_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  notes text,
  deleted_at timestamptz,
  delete_reason text
);

-- 3. hedge_execution: actual hedge contracts
CREATE TABLE IF NOT EXISTS public.hedge_execution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hedge_request_id uuid REFERENCES public.hedge_request(id) ON DELETE SET NULL,
  metal commodity_type_enum NOT NULL,
  direction hedge_direction NOT NULL,
  instrument hedge_instrument NOT NULL DEFAULT 'Future',
  quantity_mt numeric NOT NULL,
  executed_price numeric NOT NULL,
  executed_price_currency text DEFAULT 'USD',
  execution_date date NOT NULL,
  maturity_date date,
  broker_name text,
  broker_reference text,
  exchange text,
  contract_reference text,
  pnl_realized numeric,
  pnl_unrealized numeric,
  status text DEFAULT 'OPEN',
  closed_at timestamptz,
  closed_price numeric,
  notes text,
  deleted_at timestamptz,
  delete_reason text
);

-- 4. hedge_link: allocation of hedge to specific orders/tickets/BLs
CREATE TABLE IF NOT EXISTS public.hedge_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  hedge_execution_id uuid NOT NULL REFERENCES public.hedge_execution(id) ON DELETE CASCADE,
  link_level hedge_link_level NOT NULL,
  link_id text NOT NULL,
  side text CHECK (side IN ('BUY', 'SELL')),
  allocated_quantity_mt numeric NOT NULL,
  allocation_proportion numeric,
  notes text
);

-- 5. hedge_roll: roll tracking between close and reopen hedges
CREATE TABLE IF NOT EXISTS public.hedge_roll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  close_execution_id uuid NOT NULL REFERENCES public.hedge_execution(id) ON DELETE CASCADE,
  open_execution_id uuid NOT NULL REFERENCES public.hedge_execution(id) ON DELETE CASCADE,
  roll_date date NOT NULL,
  roll_cost numeric,
  roll_cost_currency text DEFAULT 'USD',
  reason text,
  notes text
);

-- Enable RLS on all tables
ALTER TABLE public.pricing_fixing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hedge_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hedge_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hedge_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hedge_roll ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_fixing
CREATE POLICY "Anyone can view pricing_fixing" ON public.pricing_fixing FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pricing_fixing" ON public.pricing_fixing FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pricing_fixing" ON public.pricing_fixing FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pricing_fixing" ON public.pricing_fixing FOR DELETE USING (true);

-- RLS Policies for hedge_request
CREATE POLICY "Anyone can view hedge_request" ON public.hedge_request FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hedge_request" ON public.hedge_request FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hedge_request" ON public.hedge_request FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete hedge_request" ON public.hedge_request FOR DELETE USING (true);

-- RLS Policies for hedge_execution
CREATE POLICY "Anyone can view hedge_execution" ON public.hedge_execution FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hedge_execution" ON public.hedge_execution FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hedge_execution" ON public.hedge_execution FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete hedge_execution" ON public.hedge_execution FOR DELETE USING (true);

-- RLS Policies for hedge_link
CREATE POLICY "Anyone can view hedge_link" ON public.hedge_link FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hedge_link" ON public.hedge_link FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hedge_link" ON public.hedge_link FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete hedge_link" ON public.hedge_link FOR DELETE USING (true);

-- RLS Policies for hedge_roll
CREATE POLICY "Anyone can view hedge_roll" ON public.hedge_roll FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hedge_roll" ON public.hedge_roll FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hedge_roll" ON public.hedge_roll FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete hedge_roll" ON public.hedge_roll FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_fixing_ticket_id ON public.pricing_fixing(ticket_id);
CREATE INDEX IF NOT EXISTS idx_hedge_request_ticket_id ON public.hedge_request(ticket_id);
CREATE INDEX IF NOT EXISTS idx_hedge_request_status ON public.hedge_request(status);
CREATE INDEX IF NOT EXISTS idx_hedge_execution_request_id ON public.hedge_execution(hedge_request_id);
CREATE INDEX IF NOT EXISTS idx_hedge_link_execution_id ON public.hedge_link(hedge_execution_id);
CREATE INDEX IF NOT EXISTS idx_hedge_link_level_id ON public.hedge_link(link_level, link_id);
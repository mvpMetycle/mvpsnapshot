-- Add freight summary fields to tickets table
ALTER TABLE ticket 
ADD COLUMN has_multimodal_freight BOOLEAN DEFAULT false,
ADD COLUMN freight_estimate_total NUMERIC,
ADD COLUMN freight_actual_total NUMERIC;

-- Create freight type enum
CREATE TYPE freight_type_enum AS ENUM ('Ship', 'Barge', 'Truck');

-- Create freight cost stage enum
CREATE TYPE freight_cost_stage_enum AS ENUM ('ESTIMATE', 'PROVISIONAL', 'ACTUAL');

-- Create freight cost source enum
CREATE TYPE freight_cost_source_enum AS ENUM ('QUOTE', 'CARRIER_INVOICE', 'MANUAL_ADJUSTMENT');

-- Create ticket_freight_legs table
CREATE TABLE ticket_freight_legs (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  leg_index INTEGER NOT NULL,
  freight_type freight_type_enum NOT NULL,
  from_location TEXT,
  to_location TEXT,
  carrier_name TEXT,
  incoterm_leg TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(ticket_id, leg_index)
);

-- Create ticket_freight_costs table (versioned costs)
CREATE TABLE ticket_freight_costs (
  id BIGSERIAL PRIMARY KEY,
  freight_leg_id BIGINT NOT NULL REFERENCES ticket_freight_legs(id) ON DELETE CASCADE,
  cost_amount NUMERIC NOT NULL,
  cost_currency CHAR(3) NOT NULL,
  cost_per_mt NUMERIC,
  stage freight_cost_stage_enum NOT NULL DEFAULT 'ESTIMATE',
  is_current BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source freight_cost_source_enum NOT NULL DEFAULT 'QUOTE',
  reference_doc_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for current cost lookups
CREATE INDEX idx_freight_costs_current ON ticket_freight_costs(freight_leg_id, is_current) WHERE is_current = true;

-- Create index for ticket freight legs
CREATE INDEX idx_freight_legs_ticket ON ticket_freight_legs(ticket_id);

-- Enable RLS on new tables
ALTER TABLE ticket_freight_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_freight_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_freight_legs
CREATE POLICY "Anyone can view freight legs" ON ticket_freight_legs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert freight legs" ON ticket_freight_legs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update freight legs" ON ticket_freight_legs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete freight legs" ON ticket_freight_legs FOR DELETE USING (true);

-- RLS policies for ticket_freight_costs
CREATE POLICY "Anyone can view freight costs" ON ticket_freight_costs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert freight costs" ON ticket_freight_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update freight costs" ON ticket_freight_costs FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete freight costs" ON ticket_freight_costs FOR DELETE USING (true);
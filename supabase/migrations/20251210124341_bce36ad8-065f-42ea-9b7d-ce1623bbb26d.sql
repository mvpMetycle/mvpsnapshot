-- Backfill ticket_id and related fields for Roll and Price_Fix requests
-- that were created before the code fix

UPDATE hedge_request hr
SET 
  ticket_id = orig_hr.ticket_id,
  pricing_type = COALESCE(hr.pricing_type, orig_hr.pricing_type),
  formula_percent = COALESCE(hr.formula_percent, orig_hr.formula_percent),
  hedge_metal = COALESCE(hr.hedge_metal, orig_hr.hedge_metal),
  instrument_type = COALESCE(hr.instrument_type, orig_hr.instrument_type)
FROM hedge_execution he
JOIN hedge_request orig_hr ON he.hedge_request_id = orig_hr.id
WHERE hr.linked_execution_id = he.id
  AND hr.ticket_id IS NULL
  AND orig_hr.ticket_id IS NOT NULL;
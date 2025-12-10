-- Drop the integer-based overload of evaluate_ticket_approval_rules to resolve function ambiguity
DROP FUNCTION IF EXISTS public.evaluate_ticket_approval_rules(
  p_ticket_id bigint, 
  p_payment_trigger_event text, 
  p_payment_trigger_timing text, 
  p_pricing_type text, 
  p_company_id bigint, 
  p_transaction_type text, 
  p_lme_action_needed integer
);
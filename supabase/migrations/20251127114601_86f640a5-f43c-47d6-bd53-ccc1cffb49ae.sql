-- Add Operations to approver_role enum
ALTER TYPE approver_role ADD VALUE IF NOT EXISTS 'Operations';

-- Update the approval rules function to route KYB issues to Operations
CREATE OR REPLACE FUNCTION public.evaluate_ticket_approval_rules(
  p_ticket_id bigint,
  p_payment_trigger_event text,
  p_payment_trigger_timing text,
  p_pricing_type text,
  p_company_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
declare
  v_required_approvers approver_role[] := '{}';
  v_rule_triggered text := '';
  v_kyb_status text;
begin
  -- Rule 1: Non-standard pricing
  if p_payment_trigger_event in ('Inspection', 'BL release', 'Customs Clearance') 
     or (p_payment_trigger_event = 'ATA' and p_payment_trigger_timing = 'After') then
    v_required_approvers := array_append(v_required_approvers, 'Hedging'::approver_role);
    v_required_approvers := array_append(v_required_approvers, 'CFO'::approver_role);
    v_rule_triggered := 'Non-standard pricing detected';
  end if;
  
  -- Rule 2: Deals requiring hedge
  if p_pricing_type in ('Formula', 'Index') then
    if not ('Hedging'::approver_role = any(v_required_approvers)) then
      v_required_approvers := array_append(v_required_approvers, 'Hedging'::approver_role);
    end if;
    if not ('CFO'::approver_role = any(v_required_approvers)) then
      v_required_approvers := array_append(v_required_approvers, 'CFO'::approver_role);
    end if;
    if v_rule_triggered = '' then
      v_rule_triggered := 'Deal requires hedge';
    else
      v_rule_triggered := v_rule_triggered || ' + Deal requires hedge';
    end if;
  end if;
  
  -- Rule 3: Counterparty without approved KYB (route to Operations)
  if p_company_id is not null then
    select kyb_status into v_kyb_status from public."Company" where id = p_company_id;
    if v_kyb_status is null or v_kyb_status != 'Approved' then
      v_required_approvers := array_append(v_required_approvers, 'Operations'::approver_role);
      if v_rule_triggered = '' then
        v_rule_triggered := 'Counterparty KYB not approved';
      else
        v_rule_triggered := v_rule_triggered || ' + Counterparty KYB not approved';
      end if;
    end if;
  end if;
  
  return jsonb_build_object(
    'requires_approval', array_length(v_required_approvers, 1) > 0,
    'required_approvers', v_required_approvers,
    'rule_triggered', v_rule_triggered
  );
end;
$$;
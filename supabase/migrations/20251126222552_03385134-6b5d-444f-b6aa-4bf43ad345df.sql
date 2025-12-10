-- Create enums for approval system
create type public.ticket_status as enum ('Draft', 'Pending Approval', 'Approved', 'Rejected');
create type public.approval_action as enum ('Approve', 'Reject', 'Request Changes');
create type public.approver_role as enum ('Hedging', 'CFO', 'Management');
create type public.app_role as enum ('admin', 'trader', 'hedging', 'cfo', 'management');

-- Add status to ticket table
alter table public.ticket add column status ticket_status not null default 'Draft';

-- Create approval_requests table
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_id bigint not null references public.ticket(id) on delete cascade,
  rule_triggered text not null,
  required_approvers approver_role[] not null,
  current_approver_index int not null default 0,
  status ticket_status not null default 'Pending Approval',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Create approval_actions table for audit trail
create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  approver_role approver_role not null,
  approver_user_id uuid references auth.users(id),
  action approval_action not null,
  comment text,
  created_at timestamp with time zone not null default now()
);

-- Create user_roles table for role-based access
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

-- Enable RLS
alter table public.approval_requests enable row level security;
alter table public.approval_actions enable row level security;
alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Temporary public policies (disable RLS enforcement for now)
create policy "Anyone can view approval requests" on public.approval_requests for select using (true);
create policy "Anyone can insert approval requests" on public.approval_requests for insert with check (true);
create policy "Anyone can update approval requests" on public.approval_requests for update using (true);

create policy "Anyone can view approval actions" on public.approval_actions for select using (true);
create policy "Anyone can insert approval actions" on public.approval_actions for insert with check (true);

create policy "Anyone can view user roles" on public.user_roles for select using (true);
create policy "Anyone can insert user roles" on public.user_roles for insert with check (true);

-- Create indexes
create index idx_approval_requests_ticket_id on public.approval_requests(ticket_id);
create index idx_approval_actions_request_id on public.approval_actions(approval_request_id);
create index idx_user_roles_user_id on public.user_roles(user_id);

-- Create function to evaluate approval rules
create or replace function public.evaluate_ticket_approval_rules(
  p_ticket_id bigint,
  p_payment_trigger_event text,
  p_payment_trigger_timing text,
  p_pricing_type text,
  p_company_id bigint
)
returns jsonb
language plpgsql
as $$
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
  
  -- Rule 3: Counterparty without approved KYB
  if p_company_id is not null then
    select kyb_status into v_kyb_status from public."Company" where id = p_company_id;
    if v_kyb_status is null or v_kyb_status != 'Approved' then
      if not ('CFO'::approver_role = any(v_required_approvers)) then
        v_required_approvers := array_append(v_required_approvers, 'CFO'::approver_role);
      end if;
      v_required_approvers := array_append(v_required_approvers, 'Management'::approver_role);
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
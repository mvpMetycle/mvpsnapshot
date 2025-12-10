import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ticketId, bulk } = await req.json();

    // Fetch enabled approval rules from database
    const { data: rules, error: rulesError } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('is_enabled', true)
      .order('priority');

    if (rulesError) {
      console.error('Error fetching approval rules:', rulesError);
      throw rulesError;
    }

    console.log(`Loaded ${rules?.length || 0} enabled approval rules`);

    // Handle bulk update of all tickets with lowercase 'b2b'
    if (bulk === true) {
      console.log('Starting bulk fix for all tickets with lowercase b2b');
      
      // Get all tickets with lowercase 'b2b'
      const { data: ticketsToFix, error: fetchError } = await supabase
        .from('ticket')
        .select('id')
        .eq('transaction_type', 'b2b');

      if (fetchError) {
        console.error('Error fetching tickets to fix:', fetchError);
        throw fetchError;
      }

      console.log(`Found ${ticketsToFix?.length || 0} tickets to fix`);

      if (!ticketsToFix || ticketsToFix.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No tickets found with lowercase b2b',
            fixed: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update all tickets with lowercase 'b2b' to 'B2B'
      const { error: updateError } = await supabase
        .from('ticket')
        .update({ transaction_type: 'B2B' })
        .eq('transaction_type', 'b2b');

      if (updateError) {
        console.error('Error bulk updating transaction types:', updateError);
        throw updateError;
      }

      console.log(`Successfully updated ${ticketsToFix.length} tickets`);

      // Process each ticket to check approval status
      const results = [];
      for (const ticket of ticketsToFix) {
        try {
          // Re-process each ticket's approval workflow
          const response = await fetch(`${supabaseUrl}/functions/v1/fix-ticket-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ ticketId: ticket.id })
          });
          
          const result = await response.json();
          results.push({ ticketId: ticket.id, ...result });
        } catch (error) {
          console.error(`Error processing ticket ${ticket.id}:`, error);
          results.push({ ticketId: ticket.id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Fixed ${ticketsToFix.length} tickets`,
          fixed: ticketsToFix.length,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single ticket processing
    if (!ticketId) {
      return new Response(
        JSON.stringify({ error: 'ticketId is required when bulk is not true' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Fixing ticket status for ticket:', ticketId);

    // First update transaction_type from lowercase to uppercase
    const { error: updateError } = await supabase
      .from('ticket')
      .update({ transaction_type: 'B2B' })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating transaction type:', updateError);
      throw updateError;
    }

    // Fetch the updated ticket
    const { data: ticket, error: fetchError } = await supabase
      .from('ticket')
      .select('*, Company!ticket_company_id_fkey(kyb_status)')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      console.error('Error fetching ticket:', fetchError);
      throw fetchError;
    }

    console.log('Ticket data:', ticket);

    // Evaluate rules dynamically
    let requiresApproval = false;
    const requiredApprovers: string[] = [];
    const rulesTriggered: string[] = [];

    for (const rule of rules || []) {
      const ruleConditions = rule.conditions;
      let ruleMatched = false;

      if (ruleConditions.logic === 'OR') {
        // Any condition matches
        ruleMatched = ruleConditions.rules.some((condition: any) => 
          evaluateCondition(ticket, condition)
        );
      } else if (ruleConditions.logic === 'AND') {
        // All conditions must match
        ruleMatched = ruleConditions.rules.every((condition: any) => 
          evaluateCondition(ticket, condition)
        );
      }

      if (ruleMatched) {
        console.log(`Rule triggered: ${rule.name}`);
        requiresApproval = true;
        rulesTriggered.push(rule.name);
        
        // Add approvers (avoid duplicates)
        for (const approver of rule.required_approvers) {
          if (!requiredApprovers.includes(approver)) {
            requiredApprovers.push(approver);
          }
        }
      }
    }

    console.log('Requires approval:', requiresApproval);
    console.log('Required approvers:', requiredApprovers);

    if (requiresApproval) {
      // Update ticket status to Pending Approval
      const { error: statusError } = await supabase
        .from('ticket')
        .update({ status: 'Pending Approval' })
        .eq('id', ticketId);

      if (statusError) {
        console.error('Error updating ticket status:', statusError);
        throw statusError;
      }

      // Create approval request if it doesn't exist
      const { data: existingRequest } = await supabase
        .from('approval_requests')
        .select('id')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (!existingRequest) {
        const { error: approvalError } = await supabase
          .from('approval_requests')
          .insert({
            ticket_id: ticketId,
            required_approvers: requiredApprovers,
            rule_triggered: rulesTriggered.join(', '),
            status: 'Pending Approval',
          });

        if (approvalError) {
          console.error('Error creating approval request:', approvalError);
          throw approvalError;
        }
      }
    } else {
      // No approval needed, set to Approved
      const { error: statusError } = await supabase
        .from('ticket')
        .update({ status: 'Approved' })
        .eq('id', ticketId);

      if (statusError) {
        console.error('Error updating ticket status to Approved:', statusError);
        throw statusError;
      }

      console.log('Ticket approved - no guardrails triggered');
    }

    return new Response(
      JSON.stringify({
        success: true,
        requiresApproval,
        requiredApprovers,
        rulesTriggered,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fix-ticket-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to evaluate a single condition
function evaluateCondition(ticket: any, condition: any): boolean {
  const { field, operator, value, values } = condition;

  // Special handling for combined fields
  if (field === 'payment_trigger_combined') {
    const combined = `${ticket.payment_trigger_event}_${ticket.payment_trigger_timing}`;
    return combined === value;
  }

  // Handle nested fields (e.g., company.kyb_status)
  if (field === 'company_kyb_status') {
    const kybStatus = ticket.Company?.kyb_status;
    if (operator === 'not_equals') {
      return kybStatus !== value && kybStatus != null;
    }
    return kybStatus === value;
  }

  // Handle pricing formula special checks
  if (field === 'pricing_formula_check' && value === 'formula_b2b_lme') {
    return (
      ticket.pricing_type === 'Formula' &&
      ticket.transaction_type === 'B2B' &&
      ticket.lme_action_needed === 1
    );
  }

  // Regular field evaluation
  const fieldValue = ticket[field];

  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'not_equals':
      return fieldValue !== value;
    case 'in':
      return Array.isArray(values) && values.includes(fieldValue);
    case 'not_in':
      return Array.isArray(values) && !values.includes(fieldValue);
    case 'custom':
      // For complex custom logic that doesn't fit standard operators
      return false;
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

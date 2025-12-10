import { supabase } from "@/integrations/supabase/client";

const defaultRules = [
  {
    name: 'Non-standard pricing',
    description: 'Triggered when payment trigger is Inspection, BL release, Customs Clearance, or ATA After',
    conditions: {
      logic: 'OR',
      rules: [
        {
          field: 'payment_trigger_event',
          operator: 'in',
          values: ['Inspection', 'BL release', 'Customs Clearance']
        },
        {
          field: 'payment_trigger_combined',
          operator: 'equals',
          value: 'ATA_After'
        }
      ]
    },
    required_approvers: ['Hedging', 'CFO'],
    priority: 1,
    is_enabled: true
  },
  {
    name: 'Deals requiring hedge',
    description: 'Triggered for Formula or Index pricing types (B2B Formula only if LME action needed)',
    conditions: {
      logic: 'OR',
      rules: [
        {
          field: 'pricing_type',
          operator: 'equals',
          value: 'Index'
        },
        {
          field: 'pricing_formula_check',
          operator: 'custom',
          value: 'formula_b2b_lme'
        }
      ]
    },
    required_approvers: ['Hedging', 'CFO'],
    priority: 2,
    is_enabled: true
  },
  {
    name: 'Counterparty KYB gap',
    description: 'Triggered when counterparty company KYB status is not Approved',
    conditions: {
      logic: 'AND',
      rules: [
        {
          field: 'company_kyb_status',
          operator: 'not_equals',
          value: 'Approved'
        }
      ]
    },
    required_approvers: ['Operations'],
    priority: 3,
    is_enabled: true
  }
];

export async function seedApprovalRules() {
  // Check if rules already exist
  const { data: existingRules, error: checkError } = await supabase
    .from('approval_rules')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('Error checking for existing rules:', checkError);
    return { success: false, error: checkError };
  }

  // If rules already exist, don't seed
  if (existingRules && existingRules.length > 0) {
    console.log('Approval rules already seeded');
    return { success: true, alreadySeeded: true };
  }

  // Insert default rules
  const { data, error } = await supabase
    .from('approval_rules')
    .insert(defaultRules)
    .select();

  if (error) {
    console.error('Error seeding approval rules:', error);
    return { success: false, error };
  }

  console.log('Successfully seeded approval rules:', data);
  return { success: true, data };
}

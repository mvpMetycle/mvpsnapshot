export type RuleCategory = 'pricing' | 'payment' | 'counterparty' | 'volume' | 'custom';

export type FieldOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'less_than' 
  | 'is_one_of'
  | 'in'
  | 'not_in';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'enum' | 'boolean';
  operators: FieldOperator[];
  enumValues?: string[];
}

export interface RuleCategoryDefinition {
  id: RuleCategory;
  label: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
}

export const RULE_CATEGORIES: RuleCategoryDefinition[] = [
  {
    id: 'pricing',
    label: 'Pricing Rules',
    description: 'Rules based on pricing type, fixation method, or LME requirements',
    icon: 'DollarSign',
    fields: [
      {
        name: 'pricing_type',
        label: 'Pricing Type',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: ['Fixed', 'Formula', 'Index'],
      },
      {
        name: 'lme_action_needed',
        label: 'LME Action Needed',
        type: 'enum',
        operators: ['equals', 'not_equals'],
        enumValues: ['Yes', 'No'],
      },
      {
        name: 'fixation_method',
        label: 'Fixation Method',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: ['1-day', '5-day avg', 'Month avg', 'Custom'],
      },
      {
        name: 'price',
        label: 'Price',
        type: 'number',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
      },
      {
        name: 'signed_price',
        label: 'Signed Price',
        type: 'number',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
      },
    ],
  },
  {
    id: 'payment',
    label: 'Payment Terms',
    description: 'Rules based on payment triggers, timing, or down payment terms',
    icon: 'CreditCard',
    fields: [
      {
        name: 'payment_trigger_event',
        label: 'Payment Trigger Event',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: [
          'ATA',
          'BL confirmed',
          'BL issuance',
          'BL release',
          'Booking',
          'Customs Clearance',
          'Delivery Note Issued (CMR)',
          'DP (documents against payment)',
          'ETA',
          'ETD (vessel departure)',
          'Fixation',
          'Inspection',
          'Invoice',
          'Loading',
          'Other - custom',
          'Sales Order Signed Date',
          'Seal',
        ],
      },
      {
        name: 'payment_trigger_timing',
        label: 'Payment Trigger Timing',
        type: 'enum',
        operators: ['equals', 'not_equals'],
        enumValues: ['Before', 'After'],
      },
      {
        name: 'payment_trigger_combined',
        label: 'Payment Trigger (Event + Timing)',
        type: 'text',
        operators: ['equals', 'not_equals'],
      },
      {
        name: 'down_payment_amount_percent',
        label: 'Down Payment %',
        type: 'text',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
      },
    ],
  },
  {
    id: 'counterparty',
    label: 'Counterparty Rules',
    description: 'Rules based on company KYB status or risk rating',
    icon: 'Building2',
    fields: [
      {
        name: 'company_kyb_status',
        label: 'Company KYB Status',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: ['Approved', 'Rejected', 'Needs Review'],
      },
      {
        name: 'company_risk_rating',
        label: 'Company Risk Rating',
        type: 'text',
        operators: ['equals', 'not_equals'],
      },
    ],
  },
  {
    id: 'volume',
    label: 'Volume & Quantity',
    description: 'Rules based on trade quantities or volumes',
    icon: 'Package',
    fields: [
      {
        name: 'quantity',
        label: 'Quantity (MT)',
        type: 'number',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
      },
      {
        name: 'signed_volume',
        label: 'Signed Volume',
        type: 'number',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than'],
      },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Rule',
    description: 'Build a custom rule with any field and condition',
    icon: 'Settings',
    fields: [
      {
        name: 'transaction_type',
        label: 'Transaction Type',
        type: 'enum',
        operators: ['equals', 'not_equals'],
        enumValues: ['B2B', 'Warehouse'],
      },
      {
        name: 'commodity_type',
        label: 'Commodity Type',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: [
          'Aluminium',
          'Mixed metals',
          'Zinc',
          'Magnesium',
          'Lead',
          'Nickel/stainless/hi-temp',
          'Copper',
          'Brass',
          'Steel',
          'Iron',
        ],
      },
      {
        name: 'incoterms',
        label: 'Incoterms',
        type: 'enum',
        operators: ['equals', 'not_equals', 'in', 'not_in'],
        enumValues: ['CFR', 'CIF', 'CIP', 'CPT', 'DAP', 'DDP', 'DPU', 'EWX', 'FAS', 'FCA', 'FOB'],
      },
    ],
  },
];

export const OPERATOR_LABELS: Record<FieldOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  greater_than: 'greater than',
  less_than: 'less than',
  is_one_of: 'is one of',
  in: 'is one of',
  not_in: 'is not one of',
};

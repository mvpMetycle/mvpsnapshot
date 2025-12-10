/**
 * Utility functions for hedge request creation and management
 */

// Enum mappings for new hedge request fields
export const HEDGE_INSTRUMENT_TYPES = ['FUTURE', 'OPTION', 'FX'] as const;
export type HedgeInstrumentType = typeof HEDGE_INSTRUMENT_TYPES[number];

export const HEDGE_REQUEST_REASONS = [
  'PHYSICAL_SALE_PRICING',
  'UNPRICING',
  'PRE_LENDING',
  'PRE_BORROWING',
  'ROLL',
  'PRICE_FIX',
] as const;
export type HedgeRequestReason = typeof HEDGE_REQUEST_REASONS[number];

export const HEDGE_METAL_TYPES = ['COPPER', 'ALUMINIUM', 'ZINC', 'NICKEL', 'LEAD', 'TIN'] as const;
export type HedgeMetalType = typeof HEDGE_METAL_TYPES[number];

// Display labels for reasons
export const HEDGE_REASON_LABELS: Record<HedgeRequestReason, string> = {
  PHYSICAL_SALE_PRICING: 'Physical sale pricing',
  UNPRICING: 'Unpricing',
  PRE_LENDING: 'Pre-lending',
  PRE_BORROWING: 'Pre-borrowing',
  ROLL: 'Roll',
  PRICE_FIX: 'Price fix',
};

// Display labels for instrument types
export const HEDGE_INSTRUMENT_LABELS: Record<HedgeInstrumentType, string> = {
  FUTURE: 'Future',
  OPTION: 'Option',
  FX: 'FX',
};

// Display labels for hedge metals
export const HEDGE_METAL_LABELS: Record<HedgeMetalType, string> = {
  COPPER: 'Copper',
  ALUMINIUM: 'Aluminium',
  ZINC: 'Zinc',
  NICKEL: 'Nickel',
  LEAD: 'Lead',
  TIN: 'Tin',
};

/**
 * Maps commodity_type from ticket/order to hedge_metal_type enum
 * Returns null if no mapping exists
 */
export function mapCommodityToHedgeMetal(commodityType: string | null | undefined): HedgeMetalType | null {
  if (!commodityType) return null;
  
  const normalized = commodityType.toUpperCase().trim();
  
  // Direct mappings
  const directMappings: Record<string, HedgeMetalType> = {
    'COPPER': 'COPPER',
    'ALUMINIUM': 'ALUMINIUM',
    'ALUMINUM': 'ALUMINIUM', // US spelling
    'ZINC': 'ZINC',
    'NICKEL': 'NICKEL',
    'LEAD': 'LEAD',
    'TIN': 'TIN',
  };
  
  // Check for direct match
  if (normalized in directMappings) {
    return directMappings[normalized];
  }
  
  // Check for partial matches (e.g., "Copper Scrap" -> COPPER)
  for (const [key, value] of Object.entries(directMappings)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // Brass maps to Copper for hedging purposes
  if (normalized.includes('BRASS')) {
    return 'COPPER';
  }
  
  return null;
}

/**
 * Derives physical side label from ticket type
 */
export function getPhysicalSideLabel(ticketType: 'Buy' | 'Sell' | string | null | undefined): string {
  if (ticketType === 'Buy') return 'Physical purchase';
  if (ticketType === 'Sell') return 'Physical sale';
  return 'Unknown';
}

interface OrderRow {
  id: string;
  allocated_quantity_mt?: number | null;
  total_quantity_mt?: number | null;
}

interface BlOrderRow {
  id: number;
  total_quantity_mt?: number | null;
  loaded_quantity_mt?: number | null;
}

interface GetDefaultHedgeQuantityParams {
  context: 'matching' | 'order' | 'bl';
  matchedQtyMt?: number;
  order?: OrderRow | null;
  blOrder?: BlOrderRow | null;
}

/**
 * Computes the default hedge quantity based on context
 */
export function getDefaultHedgeQuantityMt(params: GetDefaultHedgeQuantityParams): number {
  const { context, matchedQtyMt, order, blOrder } = params;
  
  switch (context) {
    case 'matching':
      return matchedQtyMt ?? 0;
      
    case 'order':
      if (order) {
        if (order.allocated_quantity_mt && order.allocated_quantity_mt > 0) {
          return order.allocated_quantity_mt;
        }
        // Fallback to total_quantity_mt if available (though not typical for orders)
        return (order as any).total_quantity_mt ?? 0;
      }
      return 0;
      
    case 'bl':
      if (blOrder) {
        // Use loaded_quantity_mt if available, otherwise total_quantity_mt
        return blOrder.loaded_quantity_mt ?? blOrder.total_quantity_mt ?? 0;
      }
      return 0;
      
    default:
      return 0;
  }
}

/**
 * Formats the first day of a month for storage as estimated_qp_month
 */
export function formatQpMonth(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toISOString().split('T')[0];
}

/**
 * Parses estimated_qp_month date string to {year, month} object
 */
export function parseQpMonth(dateStr: string | null | undefined): { year: number; month: number } | null {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  
  return {
    year: date.getFullYear(),
    month: date.getMonth(), // 0-indexed
  };
}

/**
 * Formats QP month for display (e.g., "March 2025")
 */
export function formatQpMonthDisplay(dateStr: string | null | undefined): string {
  const parsed = parseQpMonth(dateStr);
  if (!parsed) return '—';
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[parsed.month]} ${parsed.year}`;
}

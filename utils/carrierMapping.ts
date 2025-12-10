// Carrier mapping from BL number prefixes to full carrier names

export interface Carrier {
  code: string;
  name: string;
  logo?: string;
}

const CARRIER_PREFIXES: Record<string, Carrier> = {
  MEDU: { code: "MEDU", name: "MSC (Mediterranean Shipping Company)" },
  HDMU: { code: "HDMU", name: "Hapag-Lloyd" },
  MAEU: { code: "MAEU", name: "Maersk Line" },
  CMDU: { code: "CMDU", name: "CMA CGM" },
  COSU: { code: "COSU", name: "COSCO Shipping" },
  COSLU: { code: "COSLU", name: "COSCO Shipping" },
  OOLU: { code: "OOLU", name: "OOCL (Orient Overseas Container Line)" },
  EGLV: { code: "EGLV", name: "Evergreen Marine" },
  APLU: { code: "APLU", name: "APL (American President Lines)" },
  YMLU: { code: "YMLU", name: "Yang Ming Marine Transport" },
  HLCU: { code: "HLCU", name: "Hyundai Merchant Marine" },
  ONEY: { code: "ONEY", name: "ONE (Ocean Network Express)" },
  ZIMU: { code: "ZIMU", name: "ZIM Integrated Shipping Services" },
};

export function extractCarrierFromBL(blNumber: string | null): Carrier | null {
  if (!blNumber) return null;
  
  const normalized = blNumber.toUpperCase().trim();
  
  // Check first 4 characters for carrier code
  const prefix = normalized.substring(0, 4);
  
  if (CARRIER_PREFIXES[prefix]) {
    return CARRIER_PREFIXES[prefix];
  }
  
  // Fallback: check if any carrier code appears anywhere in BL number
  for (const [code, carrier] of Object.entries(CARRIER_PREFIXES)) {
    if (normalized.includes(code)) {
      return carrier;
    }
  }
  
  return null;
}

export function getCarrierFullName(blNumber: string | null): string {
  const carrier = extractCarrierFromBL(blNumber);
  return carrier?.name || "Unknown Carrier";
}

export function getCarrierCode(blNumber: string | null): string {
  const carrier = extractCarrierFromBL(blNumber);
  return carrier?.code || "UNKN";
}

export function getAllCarriers(): Carrier[] {
  return Object.values(CARRIER_PREFIXES);
}

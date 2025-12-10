// Port coordinates mapping for maritime route visualization
export interface PortCoordinate {
  lat: number;
  lng: number;
  locode?: string;
  country: string;
}

export const PORT_COORDINATES: Record<string, PortCoordinate> = {
  // Africa
  "BEIRA PORT, MOZAMBIQUE": { lat: -19.8286, lng: 34.8389, locode: "MZBEW", country: "Mozambique" },
  "BEIRA PORT": { lat: -19.8286, lng: 34.8389, locode: "MZBEW", country: "Mozambique" },
  "BEIRA": { lat: -19.8286, lng: 34.8389, locode: "MZBEW", country: "Mozambique" },
  
  // China
  "SHANGHAI, CHINA": { lat: 31.2304, lng: 121.4737, locode: "CNSHA", country: "China" },
  "SHANGHAI": { lat: 31.2304, lng: 121.4737, locode: "CNSHA", country: "China" },
  "SHEKOU, CHINA": { lat: 22.4667, lng: 113.9167, locode: "CNSHK", country: "China" },
  "SHEKOU": { lat: 22.4667, lng: 113.9167, locode: "CNSHK", country: "China" },
  "SHENZHEN": { lat: 22.5431, lng: 114.0579, locode: "CNSZX", country: "China" },
  "NINGBO": { lat: 29.8683, lng: 121.544, locode: "CNNGB", country: "China" },
  "TIANJIN": { lat: 39.0851, lng: 117.1989, locode: "CNTXG", country: "China" },
  
  // Hong Kong
  "HONG KONG": { lat: 22.3193, lng: 114.1694, locode: "HKHKG", country: "Hong Kong" },
  
  // Chile
  "SAN ANTONIO, CHILE": { lat: -33.5833, lng: -71.6167, locode: "CLSAI", country: "Chile" },
  "SAN ANTONIO": { lat: -33.5833, lng: -71.6167, locode: "CLSAI", country: "Chile" },
  "VALPARAISO": { lat: -33.0472, lng: -71.6127, locode: "CLVAP", country: "Chile" },
  
  // Mexico
  "VERACRUZ": { lat: 19.1738, lng: -96.1342, locode: "MXVER", country: "Mexico" },
  "MANZANILLO": { lat: 19.0544, lng: -104.3188, locode: "MXZLO", country: "Mexico" },
  
  // USA
  "LOS ANGELES": { lat: 33.7406, lng: -118.2719, locode: "USLAX", country: "USA" },
  "LONG BEACH": { lat: 33.7701, lng: -118.1937, locode: "USLGB", country: "USA" },
  "OAKLAND": { lat: 37.7961, lng: -122.2799, locode: "USOAK", country: "USA" },
  "SEATTLE": { lat: 47.6062, lng: -122.3321, locode: "USSEA", country: "USA" },
  
  // Singapore
  "SINGAPORE": { lat: 1.2644, lng: 103.8224, locode: "SGSIN", country: "Singapore" },
  
  // UAE
  "DUBAI": { lat: 25.2697, lng: 55.2966, locode: "AEDXB", country: "UAE" },
  "JEBEL ALI": { lat: 25.0118, lng: 55.0562, locode: "AEJEA", country: "UAE" },
  
  // India
  "MUMBAI": { lat: 18.9667, lng: 72.8333, locode: "INBOM", country: "India" },
  "CHENNAI": { lat: 13.0827, lng: 80.2707, locode: "INMAA", country: "India" },
  
  // Japan
  "TOKYO": { lat: 35.6532, lng: 139.7574, locode: "JPTYO", country: "Japan" },
  "YOKOHAMA": { lat: 35.4437, lng: 139.638, locode: "JPYOK", country: "Japan" },
  
  // South Korea
  "BUSAN": { lat: 35.1028, lng: 129.0403, locode: "KRPUS", country: "South Korea" },
  
  // Europe
  "ROTTERDAM": { lat: 51.9244, lng: 4.4777, locode: "NLRTM", country: "Netherlands" },
  "ROTTERDAM, NETHERLANDS": { lat: 51.9244, lng: 4.4777, locode: "NLRTM", country: "Netherlands" },
  "HAMBURG": { lat: 53.5511, lng: 9.9937, locode: "DEHAM", country: "Germany" },
  "ANTWERP": { lat: 51.2194, lng: 4.4025, locode: "BEANR", country: "Belgium" },
  
  // Africa
  "DURBAN": { lat: -29.8587, lng: 31.0218, locode: "ZADUR", country: "South Africa" },
  "DURBAN, SOUTH AFRICA": { lat: -29.8587, lng: 31.0218, locode: "ZADUR", country: "South Africa" },
  
  // USA East Coast
  "NEW YORK": { lat: 40.6892, lng: -74.0445, locode: "USNYC", country: "USA" },
  "NEW YORK, USA": { lat: 40.6892, lng: -74.0445, locode: "USNYC", country: "USA" },
};

// Fuzzy matching function to handle port name variations
export function getPortCoordinates(portName: string | null): PortCoordinate | null {
  if (!portName) return null;
  
  const normalized = portName.toUpperCase().trim();
  
  // Direct lookup
  if (PORT_COORDINATES[normalized]) {
    return PORT_COORDINATES[normalized];
  }
  
  // Fuzzy matching - check if any key contains or is contained in the search term
  for (const [key, coords] of Object.entries(PORT_COORDINATES)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return coords;
    }
  }
  
  // Check by locode
  for (const coords of Object.values(PORT_COORDINATES)) {
    if (coords.locode && normalized.includes(coords.locode)) {
      return coords;
    }
  }
  
  console.warn(`Port coordinates not found for: ${portName}`);
  return null;
}

// Get all available ports
export function getAllPorts(): Array<{ name: string; coordinates: PortCoordinate }> {
  return Object.entries(PORT_COORDINATES).map(([name, coords]) => ({
    name,
    coordinates: coords,
  }));
}

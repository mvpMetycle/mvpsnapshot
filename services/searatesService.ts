import { SeaRatesTrackingResponse, SeaRatesRouteInfo, ShippingLine } from "@/types/searates";
import { dummyEnhancedShipments } from "@/data/dummySeaRatesData";

const DUMMY_SHIPPING_LINES: ShippingLine[] = [
  { code: 'MSC', name: 'Mediterranean Shipping Company', tracking_url: 'https://www.msc.com/track-a-shipment' },
  { code: 'MAEU', name: 'Maersk Line', tracking_url: 'https://www.maersk.com/tracking' },
  { code: 'COSCO', name: 'China Ocean Shipping Company', tracking_url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking' },
  { code: 'EVERGREEN', name: 'Evergreen Marine Corporation', tracking_url: 'https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
  { code: 'HLCU', name: 'Hapag-Lloyd', tracking_url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container.html' },
  { code: 'CMA', name: 'CMA CGM', tracking_url: 'https://www.cma-cgm.com/ebusiness/tracking' },
  { code: 'OOLU', name: 'Orient Overseas Container Line', tracking_url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
  { code: 'ONE', name: 'Ocean Network Express', tracking_url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
  { code: 'YML', name: 'Yang Ming Marine Transport', tracking_url: 'https://www.yangming.com/e-service/track_trace/track_trace_cargo_tracking.aspx' },
  { code: 'ZIM', name: 'ZIM Integrated Shipping Services', tracking_url: 'https://www.zim.com/tools/track-a-shipment' }
];

/**
 * Track shipment by any tracking number (Container, BL, or Booking)
 * Currently returns dummy data. Will call SeaRates API when API key is configured.
 */
export async function trackByNumber(trackingNumber: string): Promise<SeaRatesTrackingResponse | null> {
  // TODO: Check for API key and make real API call via edge function
  // const apiKey = await getSeaRatesApiKey();
  // if (apiKey) {
  //   return await callSeaRatesAPI('track', { number: trackingNumber });
  // }
  
  // For now, return dummy data matching the tracking number
  const shipment = dummyEnhancedShipments.find(
    s => s.metadata.number === trackingNumber
  );
  
  if (!shipment) {
    return null;
  }
  
  return {
    status: 'success',
    message: 'Tracking information retrieved successfully',
    data: {
      metadata: shipment.metadata,
      locations: shipment.locations,
      route: shipment.route,
      vessels: shipment.vessels,
      containers: shipment.containers
    }
  };
}

/**
 * Get route information with coordinates between two ports
 * Currently returns dummy data. Will call SeaRates API when API key is configured.
 */
export async function getRouteInformation(
  originLocode: string,
  destLocode: string
): Promise<SeaRatesRouteInfo | null> {
  // TODO: Check for API key and make real API call via edge function
  // const apiKey = await getSeaRatesApiKey();
  // if (apiKey) {
  //   return await callSeaRatesAPI('route', { from: originLocode, to: destLocode });
  // }
  
  // For now, return dummy route data
  const shipment = dummyEnhancedShipments.find(
    s => s.route.pol.location.locode === originLocode && 
         s.route.pod.location.locode === destLocode
  );
  
  if (!shipment) {
    return null;
  }
  
  return {
    path: shipment.routePath,
    distance_nm: calculateDistance(shipment.routePath),
    estimated_duration_days: Math.ceil(
      (new Date(shipment.eta).getTime() - new Date(shipment.route.pol.date!).getTime()) / (1000 * 60 * 60 * 24)
    )
  };
}

/**
 * Get list of all supported shipping lines
 * Returns static list. Real API would provide up-to-date shipping line data.
 */
export async function getShippingLines(): Promise<ShippingLine[]> {
  // TODO: Check for API key and make real API call via edge function
  // const apiKey = await getSeaRatesApiKey();
  // if (apiKey) {
  //   return await callSeaRatesAPI('sealines', {});
  // }
  
  return DUMMY_SHIPPING_LINES;
}

/**
 * Calculate total distance in nautical miles from route path
 */
function calculateDistance(path: Array<[number, number]>): number {
  let totalDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lng1] = path[i];
    const [lat2, lng2] = path[i + 1];
    
    // Haversine formula for great circle distance
    const R = 3440.065; // Earth's radius in nautical miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalDistance += R * c;
  }
  
  return Math.round(totalDistance);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

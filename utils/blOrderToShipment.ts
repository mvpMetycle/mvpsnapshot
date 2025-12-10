import { getPortCoordinates } from "@/data/portCoordinates";
import { generateMaritimeRoute, calculateDistance, estimateVoyageDuration } from "./generateMaritimeRoute";
import { extractCarrierFromBL, getCarrierFullName } from "./carrierMapping";
import type { EnhancedShipment } from "@/types/searates";

interface BLOrder {
  id: number;
  bl_order_name: string | null;
  bl_number: string | null;
  status: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  loaded_quantity_mt: number | null;
  eta: string | null;
  ata: string | null;
  atd: string | null;
  etd: string | null;
}

export function transformBLOrderToShipment(blOrder: BLOrder): EnhancedShipment | null {
  // Get port coordinates
  const originCoords = getPortCoordinates(blOrder.port_of_loading);
  const destCoords = getPortCoordinates(blOrder.port_of_discharge);
  
  if (!originCoords || !destCoords) {
    console.warn(`Cannot create shipment for BL ${blOrder.bl_order_name}: missing port coordinates`);
    return null;
  }
  
  // Generate maritime route path
  const routePath = generateMaritimeRoute(originCoords, destCoords);
  
  // Calculate current vessel position based on journey progress
  const departureDate = blOrder.atd || blOrder.etd;
  const arrivalDate = blOrder.eta;
  
  if (!departureDate) {
    console.warn(`Cannot create shipment for BL ${blOrder.bl_order_name}: missing departure date`);
    return null;
  }
  
  // Estimate ETA if missing
  let estimatedETA = arrivalDate;
  if (!estimatedETA) {
    const distance = calculateDistance(originCoords, destCoords);
    const voyageDays = estimateVoyageDuration(distance);
    const departure = new Date(departureDate);
    const eta = new Date(departure);
    eta.setDate(eta.getDate() + voyageDays);
    estimatedETA = eta.toISOString().split('T')[0];
  }
  
  // Calculate journey progress (0 to 1)
  const now = new Date();
  const departure = new Date(departureDate);
  const arrival = new Date(estimatedETA);
  const totalDuration = arrival.getTime() - departure.getTime();
  const elapsed = now.getTime() - departure.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
  
  // Interpolate current position along route
  const currentPosition = interpolatePosition(routePath, progress);
  
  // Extract carrier information
  const carrier = extractCarrierFromBL(blOrder.bl_number);
  
  // Build EnhancedShipment object
  const shipment: EnhancedShipment = {
    metadata: {
      type: 'BL',
      number: blOrder.bl_number || blOrder.bl_order_name || `BL-${blOrder.id}`,
      sealine: carrier?.code || 'UNKN',
      sealine_name: carrier?.name || 'Unknown Carrier',
      status: blOrder.status === 'ON BOARD' ? 'IN_TRANSIT' : 'PENDING',
    },
    locations: [
      {
        id: 1,
        name: blOrder.port_of_loading || 'Unknown',
        state: null,
        country: originCoords.country,
        country_code: originCoords.locode?.substring(0, 2) || 'XX',
        locode: originCoords.locode || null,
        lat: originCoords.lat,
        lng: originCoords.lng,
      },
      {
        id: 2,
        name: blOrder.port_of_discharge || 'Unknown',
        state: null,
        country: destCoords.country,
        country_code: destCoords.locode?.substring(0, 2) || 'XX',
        locode: destCoords.locode || null,
        lat: destCoords.lat,
        lng: destCoords.lng,
      },
    ],
    route: {
      prepol: {
        location: {
          id: 0,
          name: blOrder.port_of_loading || 'Unknown',
          state: null,
          country: originCoords.country,
          country_code: originCoords.locode?.substring(0, 2) || 'XX',
          locode: originCoords.locode || null,
          lat: originCoords.lat,
          lng: originCoords.lng,
        },
        date: null,
        actual: false,
      },
      pol: {
        location: {
          id: 1,
          name: blOrder.port_of_loading || 'Unknown',
          state: null,
          country: originCoords.country,
          country_code: originCoords.locode?.substring(0, 2) || 'XX',
          locode: originCoords.locode || null,
          lat: originCoords.lat,
          lng: originCoords.lng,
        },
        date: departureDate,
        actual: !!blOrder.atd,
      },
      pod: {
        location: {
          id: 2,
          name: blOrder.port_of_discharge || 'Unknown',
          state: null,
          country: destCoords.country,
          country_code: destCoords.locode?.substring(0, 2) || 'XX',
          locode: destCoords.locode || null,
          lat: destCoords.lat,
          lng: destCoords.lng,
        },
        date: estimatedETA,
        actual: !!blOrder.ata,
      },
      postpod: {
        location: {
          id: 3,
          name: blOrder.port_of_discharge || 'Unknown',
          state: null,
          country: destCoords.country,
          country_code: destCoords.locode?.substring(0, 2) || 'XX',
          locode: destCoords.locode || null,
          lat: destCoords.lat,
          lng: destCoords.lng,
        },
        date: null,
        actual: false,
      },
    },
    vessels: [
      {
        id: blOrder.id,
        name: `Vessel ${blOrder.bl_order_name || blOrder.bl_number || blOrder.id}`,
        imo: 0,
        call_sign: '',
        mmsi: 0,
        flag: carrier?.code || 'XX',
      },
    ],
    containers: [],
    routePath,
    currentPosition,
    quantity: blOrder.loaded_quantity_mt || 0,
    eta: estimatedETA,
  };
  
  return shipment;
}

function interpolatePosition(
  routePath: Array<[number, number]>,
  progress: number
): { lat: number; lng: number } {
  if (progress <= 0) {
    return { lat: routePath[0][0], lng: routePath[0][1] };
  }
  if (progress >= 1) {
    const last = routePath[routePath.length - 1];
    return { lat: last[0], lng: last[1] };
  }
  
  // Find which segment we're on
  const totalSegments = routePath.length - 1;
  const segmentIndex = Math.floor(progress * totalSegments);
  const segmentProgress = (progress * totalSegments) - segmentIndex;
  
  const start = routePath[segmentIndex];
  const end = routePath[Math.min(segmentIndex + 1, routePath.length - 1)];
  
  // Linear interpolation between waypoints
  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;
  
  return { lat, lng };
}

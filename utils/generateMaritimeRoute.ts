// Generate realistic maritime routes between two ports

interface Coordinate {
  lat: number;
  lng: number;
}

// Major maritime waypoints and chokepoints
const WAYPOINTS = {
  SUEZ_CANAL_NORTH: { lat: 31.2653, lng: 32.3019 },
  SUEZ_CANAL_SOUTH: { lat: 29.9668, lng: 32.5498 },
  CAPE_GOOD_HOPE: { lat: -34.3587, lng: 18.4716 },
  STRAIT_MALACCA: { lat: 1.4367, lng: 103.0, },
  PANAMA_CANAL: { lat: 9.08, lng: -79.68 },
  GIBRALTAR: { lat: 36.1408, lng: -5.3536 },
  SINGAPORE: { lat: 1.2644, lng: 103.8224 },
};

export function generateMaritimeRoute(
  origin: Coordinate,
  destination: Coordinate
): Array<[number, number]> {
  const route: Array<[number, number]> = [];
  
  // Add origin
  route.push([origin.lat, origin.lng]);
  
  // Determine route based on origin and destination regions
  const originRegion = determineRegion(origin);
  const destRegion = determineRegion(destination);
  
  // Africa East Coast to Asia
  if (originRegion === 'africa-east' && destRegion === 'asia') {
    // Route: Beira → Madagascar Channel → Indian Ocean → Malacca Strait → Destination
    route.push([-25, 45]); // Madagascar Channel
    route.push([-10, 70]); // Indian Ocean
    route.push([WAYPOINTS.STRAIT_MALACCA.lat, WAYPOINTS.STRAIT_MALACCA.lng]);
    route.push([WAYPOINTS.SINGAPORE.lat, WAYPOINTS.SINGAPORE.lng]);
  }
  
  // South America West Coast to Asia
  else if (originRegion === 'south-america-west' && destRegion === 'asia') {
    // Route: Chile → Across Pacific → Destination
    // Use extended negative longitudes to avoid date line crossing issues
    route.push([-20, -90]); // Mid Pacific
    route.push([0, -140]); // Equator crossing
    route.push([10, -170]); // North Pacific
    route.push([20, -200]); // Approach Asia (extended longitude to avoid date line jump)
  }
  
  // Mexico/Central America to China
  else if (originRegion === 'central-america' && destRegion === 'asia') {
    // Route: Veracruz → Pacific → Destination
    // Use extended negative longitudes to avoid date line crossing issues
    route.push([15, -110]); // East Pacific
    route.push([20, -140]); // Mid Pacific
    route.push([25, -190]); // West Pacific (extended longitude to avoid date line jump)
  }
  
  // Europe to Asia
  else if (originRegion === 'europe' && destRegion === 'asia') {
    route.push([WAYPOINTS.GIBRALTAR.lat, WAYPOINTS.GIBRALTAR.lng]);
    route.push([WAYPOINTS.SUEZ_CANAL_NORTH.lat, WAYPOINTS.SUEZ_CANAL_NORTH.lng]);
    route.push([WAYPOINTS.SUEZ_CANAL_SOUTH.lat, WAYPOINTS.SUEZ_CANAL_SOUTH.lng]);
    route.push([15, 60]); // Arabian Sea
    route.push([WAYPOINTS.STRAIT_MALACCA.lat, WAYPOINTS.STRAIT_MALACCA.lng]);
  }
  
  // Europe to North America (Trans-Atlantic)
  else if (originRegion === 'europe' && destRegion === 'north-america-east') {
    route.push([50, -10]); // North Atlantic
    route.push([45, -30]); // Mid Atlantic
    route.push([40, -50]); // Approach North America
  }
  
  // Africa South to Asia (Around Cape or Suez)
  else if (originRegion === 'africa-south' && destRegion === 'asia') {
    route.push([WAYPOINTS.CAPE_GOOD_HOPE.lat, WAYPOINTS.CAPE_GOOD_HOPE.lng]);
    route.push([-20, 40]); // Indian Ocean
    route.push([-5, 60]); // Approach India
  }
  
  // Default: Simple great circle approximation with 3 waypoints
  else {
    const midLat1 = origin.lat + (destination.lat - origin.lat) * 0.33;
    const midLng1 = origin.lng + (destination.lng - origin.lng) * 0.33;
    const midLat2 = origin.lat + (destination.lat - origin.lat) * 0.66;
    const midLng2 = origin.lng + (destination.lng - origin.lng) * 0.66;
    
    route.push([midLat1, midLng1]);
    route.push([midLat2, midLng2]);
  }
  
  // Add destination
  // Normalize destination longitude if needed for westward crossings
  let destLng = destination.lng;
  if (route.length > 1) {
    const lastWaypoint = route[route.length - 1];
    // If last waypoint is extended negative and destination is positive, extend destination too
    if (lastWaypoint[1] < -180 && destLng > 0) {
      destLng = destLng - 360;
    }
  }
  route.push([destination.lat, destLng]);
  
  return route;
}

function determineRegion(coord: Coordinate): string {
  const { lat, lng } = coord;
  
  // Africa East Coast
  if (lat >= -35 && lat <= 5 && lng >= 30 && lng <= 50) {
    return 'africa-east';
  }
  
  // South America West Coast
  if (lat >= -55 && lat <= 10 && lng >= -85 && lng <= -65) {
    return 'south-america-west';
  }
  
  // Central America / Mexico
  if (lat >= 5 && lat <= 30 && lng >= -110 && lng <= -85) {
    return 'central-america';
  }
  
  // Asia (East/Southeast)
  if (lat >= -10 && lat <= 50 && lng >= 95 && lng <= 145) {
    return 'asia';
  }
  
  // Europe
  if (lat >= 35 && lat <= 70 && lng >= -10 && lng <= 40) {
    return 'europe';
  }
  
  // North America West Coast
  if (lat >= 25 && lat <= 60 && lng >= -130 && lng <= -110) {
    return 'north-america-west';
  }
  
  // North America East Coast
  if (lat >= 25 && lat <= 50 && lng >= -80 && lng <= -65) {
    return 'north-america-east';
  }
  
  // Africa South
  if (lat >= -35 && lat <= -15 && lng >= 15 && lng <= 35) {
    return 'africa-south';
  }
  
  return 'other';
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
    Math.cos(toRad(coord2.lat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Estimate voyage duration based on distance
export function estimateVoyageDuration(distanceKm: number): number {
  const averageSpeedKnots = 16; // Container ship average speed
  const averageSpeedKmH = averageSpeedKnots * 1.852; // Convert knots to km/h
  const hoursRequired = distanceKm / averageSpeedKmH;
  return Math.ceil(hoursRequired / 24); // Return days
}

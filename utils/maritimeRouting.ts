import { LatLngExpression } from "leaflet";

/**
 * Create maritime route from SeaRates API coordinates, split into segments
 * to handle date line crossings properly
 */
export function createMaritimeRouteFromCoordinates(
  routePath: Array<[number, number]>,
  currentPosition: [number, number]
): LatLngExpression[][] {
  if (!routePath || routePath.length === 0) {
    return [[]];
  }

  // Find where to insert current position (closest segment)
  const insertIndex = findClosestSegment(currentPosition, routePath);
  const routeWithCurrent = [...routePath];
  routeWithCurrent.splice(insertIndex, 0, currentPosition);
  
  // Build route as single continuous segment with interpolation
  // Since we now use extended longitudes, date line crossings are handled
  const segment: LatLngExpression[] = [];
  
  for (let i = 0; i < routeWithCurrent.length - 1; i++) {
    const [lat1, lng1] = routeWithCurrent[i];
    const [lat2, lng2] = routeWithCurrent[i + 1];
    
    // Interpolate smoothly between waypoints
    const interpolated = interpolateSegment([lat1, lng1], [lat2, lng2], 5);
    
    if (segment.length === 0) {
      segment.push(...interpolated);
    } else {
      // Skip first point to avoid duplication
      segment.push(...interpolated.slice(1));
    }
  }
  
  return segment.length > 1 ? [segment] : [[]];
}

/**
 * Find closest point on route to insert current position
 */
function findClosestSegment(
  currentPos: [number, number],
  routePoints: Array<[number, number]>
): number {
  let minDist = Infinity;
  let closestIndex = 0;
  
  for (let i = 0; i < routePoints.length - 1; i++) {
    const [lat1, lng1] = routePoints[i];
    const [lat2, lng2] = routePoints[i + 1];
    const [currLat, currLng] = currentPos;
    
    // Calculate distance from current position to segment midpoint
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;
    const dist = Math.sqrt(
      Math.pow(currLat - midLat, 2) + Math.pow(currLng - midLng, 2)
    );
    
    if (dist < minDist) {
      minDist = dist;
      closestIndex = i + 1;
    }
  }
  
  return closestIndex;
}

/**
 * Simple linear interpolation for smooth segments
 * Does NOT handle date line crossing - that's handled at route level
 */
function interpolateSegment(
  start: [number, number],
  end: [number, number],
  segments: number = 5
): LatLngExpression[] {
  const points: LatLngExpression[] = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  
  // Simple linear interpolation
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = lat1 + (lat2 - lat1) * t;
    const lng = lng1 + (lng2 - lng1) * t;
    points.push([lat, lng]);
  }
  
  return points;
}

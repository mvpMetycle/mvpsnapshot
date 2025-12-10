import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createMaritimeRouteFromCoordinates } from "@/utils/maritimeRouting";
import { differenceInDays } from "date-fns";
import type { EnhancedShipment } from "@/types/searates";
import metycleLogoWhite from "@/assets/metycle-logo-white.png";

interface ShipmentMapProps {
  shipments: EnhancedShipment[];
  selectedShipmentId: string | null;
  onSelectShipment: (shipmentId: string | null) => void;
}

// Status color mapping
const getStatusColor = (etaDate: string | null, departureDate: string | null): string => {
  if (!etaDate || !departureDate) return "#22c55e"; // green default
  
  const now = new Date();
  const eta = new Date(etaDate);
  const daysRemaining = differenceInDays(eta, now);
  
  if (daysRemaining < 0) return "#ef4444"; // red - Delayed
  if (daysRemaining <= 3) return "#eab308"; // yellow - Arriving Soon
  return "#22c55e"; // green - On Time
};

// Calculate bearing angle between two coordinates
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
};

const createShipmentIcon = (rotation: number = 0, color: string = "#22c55e") => {
  return L.divIcon({
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg)">
        <polygon points="12,2 22,22 12,17 2,22" fill="${color}" stroke="white" stroke-width="2" />
      </svg>
    `,
    className: "shipment-triangle-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createPortIcon = () => {
  return L.divIcon({
    html: `
      <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="5" fill="#94a3b8" stroke="white" stroke-width="1.5" />
      </svg>
    `,
    className: "shipment-port-icon",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const ShipmentMap: React.FC<ShipmentMapProps> = ({ shipments, selectedShipmentId, onSelectShipment }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map and render shipments
  useEffect(() => {
    if (mapRef.current || !containerRef.current || shipments.length === 0) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      maxBoundsViscosity: 0,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // Clear previous markers
    markersRef.current.clear();

    // Draw shipments at multiple world offsets for infinite scrolling
    const worldOffsets = [-360, 0, 360];

    shipments.forEach((shipment) => {
      // Use route path from generated maritime route
      const maritimeRouteSegments = createMaritimeRouteFromCoordinates(
        shipment.routePath,
        [shipment.currentPosition.lat, shipment.currentPosition.lng]
      );

      const originLoc = shipment.route.pol.location;
      const destLoc = shipment.route.pod.location;

      // Get status color based on ETA
      const statusColor = getStatusColor(shipment.eta, shipment.route.pol.date);

      // Calculate direction vessel is heading
      const currentPos = shipment.currentPosition;
      let nextLat = destLoc.lat;
      let nextLng = destLoc.lng;
      
      // Find next waypoint from current position
      for (let i = 0; i < shipment.routePath.length - 1; i++) {
        const waypoint = shipment.routePath[i];
        if (Array.isArray(waypoint)) {
          const distance = Math.sqrt(
            Math.pow(waypoint[0] - currentPos.lat, 2) + 
            Math.pow(waypoint[1] - currentPos.lng, 2)
          );
          if (distance < 5) { // Close to this waypoint, use next one
            const next = shipment.routePath[i + 1];
            if (Array.isArray(next)) {
              nextLat = next[0];
              nextLng = next[1];
              break;
            }
          }
        }
      }
      
      const bearing = calculateBearing(
        currentPos.lat, 
        currentPos.lng, 
        nextLat, 
        nextLng
      );

        worldOffsets.forEach((offset, offsetIndex) => {
        // Draw each segment separately to handle date line crossings
        maritimeRouteSegments.forEach((segment) => {
          if (segment.length > 1) {
            const offsetSegment = segment.map((coord) => {
              if (Array.isArray(coord)) {
                return [coord[0], coord[1] + offset] as [number, number];
              }
              return coord;
            }) as L.LatLngExpression[];
            L.polyline(offsetSegment, {
              color: "#70F3DC", // Metycle mint - consistent route color
              weight: 2,
              opacity: 0.6,
              dashArray: "5,10",
            }).addTo(map);
          }
        });

        // Origin port marker
        const originMarker = L.marker([originLoc.lat, originLoc.lng + offset], {
          icon: createPortIcon(),
        }).addTo(map);
        originMarker.bindPopup(
          `<div style="font-size: 12px;">
            <strong>Origin:</strong> ${originLoc.name}<br/>
            <span style="color: #888;">${originLoc.locode || ''}</span>
          </div>`
        );

        // Destination port marker
        const destinationMarker = L.marker([destLoc.lat, destLoc.lng + offset], {
          icon: createPortIcon(),
        }).addTo(map);
        destinationMarker.bindPopup(
          `<div style="font-size: 12px;">
            <strong>Destination:</strong> ${destLoc.name}<br/>
            <span style="color: #888;">${destLoc.locode || ''}</span>
          </div>`
        );

        // Current vessel position marker (SHIP ICON) with status color
        const shipmentMarker = L.marker(
          [shipment.currentPosition.lat, shipment.currentPosition.lng + offset],
          { icon: createShipmentIcon(bearing, statusColor) },
        ).addTo(map);
        
        shipmentMarker.bindPopup(
          `<div style="padding: 8px 6px; font-family: system-ui; font-size: 12px; color: #70F3DC;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${shipment.metadata.number}</div>
            <div style="margin-bottom: 2px;"><strong>Carrier:</strong> ${shipment.metadata.sealine_name}</div>
            <div style="margin-bottom: 2px;"><strong>Status:</strong> ${shipment.metadata.status.replace('_', ' ')}</div>
            <div style="margin-bottom: 2px;"><strong>Route:</strong> ${originLoc.name} → ${destLoc.name}</div>
            <div style="margin-bottom: 2px;"><strong>Quantity:</strong> ${shipment.quantity} MT</div>
            <div style="margin-bottom: 2px;"><strong>Departed:</strong> ${shipment.route.pol.date ? new Date(shipment.route.pol.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
            <div><strong>ETA:</strong> ${shipment.eta ? new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
          </div>`,
          {
            className: 'metycle-popup'
          }
        );

        // Store only the center world (offset 0) marker for selection
        if (offsetIndex === 1) {
          markersRef.current.set(shipment.metadata.number, shipmentMarker);
        }

        // Add click handler to marker
        shipmentMarker.on('click', () => {
          onSelectShipment(shipment.metadata.number);
        });
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [shipments, onSelectShipment]);

  // Handle selection changes - pan to selected shipment and open popup
  useEffect(() => {
    if (!mapRef.current || !selectedShipmentId) return;

    const marker = markersRef.current.get(selectedShipmentId);
    if (marker) {
      const latLng = marker.getLatLng();
      mapRef.current.flyTo(latLng, 4, { duration: 1 });
      setTimeout(() => {
        marker.openPopup();
      }, 500);
    }
  }, [selectedShipmentId]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden z-0">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/10" />
      {/* Fixed logo overlay */}
      <div className="absolute -bottom-8 left-4 pointer-events-none" style={{ zIndex: 1000 }}>
        <img 
          src={metycleLogoWhite} 
          alt="Metycle" 
          className="h-48 w-auto opacity-90"
        />
      </div>
    </div>
  );
};

export default ShipmentMap;

export interface SeaRatesLocation {
  id: number;
  name: string;
  state: string | null;
  country: string;
  country_code: string;
  locode: string | null;
  lat: number;
  lng: number;
}

export interface RoutePoint {
  location: SeaRatesLocation;
  date: string | null;
  actual: boolean;
}

export interface SeaRatesVessel {
  id: number;
  name: string;
  imo: number;
  call_sign: string;
  mmsi: number;
  flag: string;
}

export interface ContainerInfo {
  number: string;
  iso_code: string;
  status: string;
  events: Array<{
    order_id: number;
    location: SeaRatesLocation;
    state: string;
    date: string;
    actual: boolean;
    voyage: string | null;
    vessel: string | null;
  }>;
}

export interface SeaRatesMetadata {
  type: 'CT' | 'BL' | 'BK'; // Container, Bill of Lading, Booking
  number: string;
  sealine: string;
  sealine_name: string;
  status: string;
}

export interface SeaRatesTrackingResponse {
  status: string;
  message: string;
  data: {
    metadata: SeaRatesMetadata;
    locations: SeaRatesLocation[];
    route: {
      prepol: RoutePoint;
      pol: RoutePoint;
      pod: RoutePoint;
      postpod: RoutePoint;
    };
    vessels: SeaRatesVessel[];
    containers: ContainerInfo[];
  };
}

export interface SeaRatesRouteInfo {
  path: Array<[number, number]>; // Array of [lat, lng] coordinates
  distance_nm: number;
  estimated_duration_days: number;
}

export interface ShippingLine {
  code: string;
  name: string;
  logo_url?: string;
  tracking_url?: string;
}

export interface EnhancedShipment {
  // From SeaRates tracking
  metadata: SeaRatesMetadata;
  locations: SeaRatesLocation[];
  route: {
    prepol: RoutePoint;
    pol: RoutePoint;
    pod: RoutePoint;
    postpod: RoutePoint;
  };
  vessels: SeaRatesVessel[];
  containers: ContainerInfo[];
  
  // Route path coordinates (from Route Information API)
  routePath: Array<[number, number]>;
  
  // Current position (calculated from events)
  currentPosition: { lat: number; lng: number };
  
  // Display data
  quantity: number;
  eta: string;
}

import { EnhancedShipment } from "@/types/searates";

export const dummyEnhancedShipments: EnhancedShipment[] = [
  {
    metadata: {
      type: 'CT',
      number: 'MEDUAK258625',
      sealine: 'MSC',
      sealine_name: 'Mediterranean Shipping Company',
      status: 'IN_TRANSIT'
    },
    locations: [
      { id: 1, name: 'Antwerp', state: null, country: 'Belgium', country_code: 'BE', locode: 'BEANR', lat: 51.2194, lng: 4.4025 },
      { id: 2, name: 'Dammam', state: null, country: 'Saudi Arabia', country_code: 'SA', locode: 'SADAM', lat: 26.4207, lng: 50.0888 }
    ],
    route: {
      prepol: {
        location: { id: 1, name: 'Antwerp', state: null, country: 'Belgium', country_code: 'BE', locode: 'BEANR', lat: 51.2194, lng: 4.4025 },
        date: '2025-11-18',
        actual: true
      },
      pol: {
        location: { id: 1, name: 'Antwerp', state: null, country: 'Belgium', country_code: 'BE', locode: 'BEANR', lat: 51.2194, lng: 4.4025 },
        date: '2025-11-20',
        actual: true
      },
      pod: {
        location: { id: 2, name: 'Dammam', state: null, country: 'Saudi Arabia', country_code: 'SA', locode: 'SADAM', lat: 26.4207, lng: 50.0888 },
        date: '2025-12-14',
        actual: false
      },
      postpod: {
        location: { id: 2, name: 'Dammam', state: null, country: 'Saudi Arabia', country_code: 'SA', locode: 'SADAM', lat: 26.4207, lng: 50.0888 },
        date: '2025-12-16',
        actual: false
      }
    },
    vessels: [
      { id: 1, name: 'MSC AURORA', imo: 9876543, call_sign: 'ABCD1', mmsi: 636012345, flag: 'LR' }
    ],
    containers: [
      {
        number: 'MEDU2586251',
        iso_code: '45G1',
        status: 'IN_TRANSIT',
        events: [
          {
            order_id: 1,
            location: { id: 1, name: 'Antwerp', state: null, country: 'Belgium', country_code: 'BE', locode: 'BEANR', lat: 51.2194, lng: 4.4025 },
            state: 'Gate in',
            date: '2024-01-20T08:00:00Z',
            actual: true,
            voyage: 'MSC401W',
            vessel: 'MSC AURORA'
          },
          {
            order_id: 2,
            location: { id: 1, name: 'Antwerp', state: null, country: 'Belgium', country_code: 'BE', locode: 'BEANR', lat: 51.2194, lng: 4.4025 },
            state: 'Loaded',
            date: '2024-01-22T14:00:00Z',
            actual: true,
            voyage: 'MSC401W',
            vessel: 'MSC AURORA'
          }
        ]
      }
    ],
    routePath: [
      [51.2194, 4.4025],    // Antwerp
      [51.0, 3.5],          // North Sea
      [50.0, 2.0],          // English Channel
      [48.5, 0.0],          // Off France
      [43.0, -5.0],         // Bay of Biscay
      [40.0, -8.0],         // Off Portugal
      [36.5, -6.0],         // Strait of Gibraltar
      [36.2, -3.0],         // Entering Med
      [37.0, 0.0],          // Western Med
      [38.0, 5.0],          // Central Med
      [37.0, 10.0],         // Central Med
      [35.0, 15.0],         // Eastern Med
      [34.0, 20.0],         // Eastern Med
      [33.0, 25.0],         // Approaching Suez
      [31.0, 32.3],         // Suez Canal North
      [30.5, 32.4],         // Suez Canal
      [30.0, 32.6],         // Suez Canal South
      [28.0, 34.0],         // Red Sea North
      [25.0, 36.0],         // Red Sea
      [20.0, 40.0],         // Red Sea Central
      [15.0, 42.0],         // Red Sea South
      [12.5, 43.5],         // Bab-el-Mandeb
      [13.0, 45.0],         // Gulf of Aden
      [14.0, 48.0],         // Gulf of Aden
      [16.0, 50.0],         // Arabian Sea West
      [20.0, 52.0],         // Arabian Sea
      [24.0, 52.0],         // Arabian Gulf approach
      [26.4207, 50.0888]    // Dammam
    ],
    currentPosition: { lat: 35.5, lng: 25.3 },
    quantity: 326.9,
    eta: '2025-12-14'
  },
  {
    metadata: {
      type: 'BL',
      number: 'HLCUBSC2411AVPR3',
      sealine: 'EVERGREEN',
      sealine_name: 'Evergreen Marine Corporation',
      status: 'IN_TRANSIT'
    },
    locations: [
      { id: 3, name: 'Houston', state: 'Texas', country: 'United States', country_code: 'US', locode: 'USHOU', lat: 29.7604, lng: -95.3698 },
      { id: 4, name: 'Mundra', state: null, country: 'India', country_code: 'IN', locode: 'INMUN', lat: 22.8392, lng: 69.7257 }
    ],
    route: {
      prepol: {
        location: { id: 3, name: 'Houston', state: 'Texas', country: 'United States', country_code: 'US', locode: 'USHOU', lat: 29.7604, lng: -95.3698 },
        date: '2025-11-13',
        actual: true
      },
      pol: {
        location: { id: 3, name: 'Houston', state: 'Texas', country: 'United States', country_code: 'US', locode: 'USHOU', lat: 29.7604, lng: -95.3698 },
        date: '2025-11-15',
        actual: true
      },
      pod: {
        location: { id: 4, name: 'Mundra', state: null, country: 'India', country_code: 'IN', locode: 'INMUN', lat: 22.8392, lng: 69.7257 },
        date: '2025-12-18',
        actual: false
      },
      postpod: {
        location: { id: 4, name: 'Mundra', state: null, country: 'India', country_code: 'IN', locode: 'INMUN', lat: 22.8392, lng: 69.7257 },
        date: '2025-12-20',
        actual: false
      }
    },
    vessels: [
      { id: 2, name: 'EVER GIVEN', imo: 9811000, call_sign: 'HPJY', mmsi: 353136000, flag: 'PA' }
    ],
    containers: [
      {
        number: 'HLCU2411001',
        iso_code: '42G1',
        status: 'IN_TRANSIT',
        events: [
          {
            order_id: 1,
            location: { id: 3, name: 'Houston', state: 'Texas', country: 'United States', country_code: 'US', locode: 'USHOU', lat: 29.7604, lng: -95.3698 },
            state: 'Gate in',
            date: '2024-01-15T10:00:00Z',
            actual: true,
            voyage: 'EVG202E',
            vessel: 'EVER GIVEN'
          },
          {
            order_id: 2,
            location: { id: 3, name: 'Houston', state: 'Texas', country: 'United States', country_code: 'US', locode: 'USHOU', lat: 29.7604, lng: -95.3698 },
            state: 'Loaded',
            date: '2024-01-18T16:00:00Z',
            actual: true,
            voyage: 'EVG202E',
            vessel: 'EVER GIVEN'
          }
        ]
      }
    ],
    routePath: [
      [29.7604, -95.3698],  // Houston
      [28.0, -92.0],        // Gulf of Mexico
      [25.0, -88.0],        // Gulf
      [22.0, -85.0],        // Caribbean approach
      [18.0, -80.0],        // Caribbean
      [15.0, -75.0],        // Caribbean
      [12.0, -72.0],        // Caribbean East
      [10.0, -68.0],        // Off Venezuela
      [8.0, -60.0],         // Atlantic
      [5.0, -50.0],         // Atlantic
      [2.0, -40.0],         // Atlantic
      [0.0, -30.0],         // Equatorial Atlantic
      [5.0, -20.0],         // Atlantic
      [15.0, -10.0],        // Off Africa
      [25.0, -5.0],         // NW Africa
      [32.0, -2.0],         // Off Morocco
      [36.0, -6.0],         // Strait of Gibraltar
      [36.5, -3.0],         // Entering Med
      [37.0, 2.0],          // Western Med
      [38.0, 8.0],          // Central Med
      [36.0, 14.0],         // Central Med
      [34.0, 22.0],         // Eastern Med
      [32.0, 28.0],         // Approaching Suez
      [31.0, 32.3],         // Suez Canal North
      [30.0, 32.6],         // Suez Canal South
      [27.0, 34.5],         // Red Sea North
      [22.0, 38.0],         // Red Sea
      [16.0, 41.0],         // Red Sea
      [12.5, 43.5],         // Bab-el-Mandeb
      [12.0, 46.0],         // Gulf of Aden
      [12.0, 52.0],         // Arabian Sea West
      [13.0, 58.0],         // Arabian Sea
      [15.0, 62.0],         // Arabian Sea
      [18.0, 66.0],         // Arabian Sea East
      [22.8392, 69.7257]    // Mundra
    ],
    currentPosition: { lat: 12.5, lng: 45.2 },
    quantity: 16.43,
    eta: '2025-12-18'
  },
  {
    metadata: {
      type: 'CT',
      number: 'COSCO789456',
      sealine: 'COSCO',
      sealine_name: 'China Ocean Shipping Company',
      status: 'IN_TRANSIT'
    },
    locations: [
      { id: 5, name: 'Shanghai', state: null, country: 'China', country_code: 'CN', locode: 'CNSHA', lat: 31.2304, lng: 121.4737 },
      { id: 6, name: 'Los Angeles', state: 'California', country: 'United States', country_code: 'US', locode: 'USLAX', lat: 33.7490, lng: -118.2647 }
    ],
    route: {
      prepol: {
        location: { id: 5, name: 'Shanghai', state: null, country: 'China', country_code: 'CN', locode: 'CNSHA', lat: 31.2304, lng: 121.4737 },
        date: '2025-11-23',
        actual: true
      },
      pol: {
        location: { id: 5, name: 'Shanghai', state: null, country: 'China', country_code: 'CN', locode: 'CNSHA', lat: 31.2304, lng: 121.4737 },
        date: '2025-11-25',
        actual: true
      },
      pod: {
        location: { id: 6, name: 'Los Angeles', state: 'California', country: 'United States', country_code: 'US', locode: 'USLAX', lat: 33.7490, lng: -118.2647 },
        date: '2025-12-16',
        actual: false
      },
      postpod: {
        location: { id: 6, name: 'Los Angeles', state: 'California', country: 'United States', country_code: 'US', locode: 'USLAX', lat: 33.7490, lng: -118.2647 },
        date: '2025-12-18',
        actual: false
      }
    },
    vessels: [
      { id: 3, name: 'COSCO HARMONY', imo: 9456789, call_sign: 'VRWK7', mmsi: 477123456, flag: 'HK' }
    ],
    containers: [
      {
        number: 'COSU7894561',
        iso_code: '45G1',
        status: 'IN_TRANSIT',
        events: [
          {
            order_id: 1,
            location: { id: 5, name: 'Shanghai', state: null, country: 'China', country_code: 'CN', locode: 'CNSHA', lat: 31.2304, lng: 121.4737 },
            state: 'Gate in',
            date: '2024-01-25T06:00:00Z',
            actual: true,
            voyage: 'COS301W',
            vessel: 'COSCO HARMONY'
          },
          {
            order_id: 2,
            location: { id: 5, name: 'Shanghai', state: null, country: 'China', country_code: 'CN', locode: 'CNSHA', lat: 31.2304, lng: 121.4737 },
            state: 'Loaded',
            date: '2024-01-28T12:00:00Z',
            actual: true,
            voyage: 'COS301W',
            vessel: 'COSCO HARMONY'
          }
        ]
      }
    ],
    routePath: [
      [31.2304, 121.4737],  // Shanghai
      [32.0, 125.0],        // East China Sea
      [33.0, 130.0],        // Off Japan
      [34.0, 135.0],        // Pacific
      [35.0, 140.0],        // Pacific
      [36.0, 145.0],        // Pacific
      [37.0, 150.0],        // Pacific
      [38.0, 155.0],        // North Pacific
      [39.0, 160.0],        // North Pacific
      [40.0, 165.0],        // North Pacific
      [40.0, 170.0],        // North Pacific
      [40.0, 175.0],        // North Pacific
      [40.0, 180.0],        // Date line
      [40.0, -175.0],       // Date line
      [40.0, -170.0],       // North Pacific
      [39.0, -165.0],       // North Pacific
      [38.0, -160.0],       // North Pacific
      [37.0, -155.0],       // North Pacific
      [36.0, -150.0],       // Pacific
      [35.0, -145.0],       // Pacific
      [35.0, -140.0],       // Pacific
      [34.5, -135.0],       // Pacific
      [34.0, -130.0],       // Pacific
      [33.7490, -118.2647]  // Los Angeles
    ],
    currentPosition: { lat: 35.0, lng: -140.5 },
    quantity: 450.2,
    eta: '2025-12-16'
  },
  {
    metadata: {
      type: 'BL',
      number: 'MAERSK654321',
      sealine: 'MAEU',
      sealine_name: 'Maersk Line',
      status: 'IN_TRANSIT'
    },
    locations: [
      { id: 7, name: 'Rotterdam', state: null, country: 'Netherlands', country_code: 'NL', locode: 'NLRTM', lat: 51.9225, lng: 4.4792 },
      { id: 8, name: 'Singapore', state: null, country: 'Singapore', country_code: 'SG', locode: 'SGSIN', lat: 1.3521, lng: 103.8198 }
    ],
    route: {
      prepol: {
        location: { id: 7, name: 'Rotterdam', state: null, country: 'Netherlands', country_code: 'NL', locode: 'NLRTM', lat: 51.9225, lng: 4.4792 },
        date: '2025-11-20',
        actual: true
      },
      pol: {
        location: { id: 7, name: 'Rotterdam', state: null, country: 'Netherlands', country_code: 'NL', locode: 'NLRTM', lat: 51.9225, lng: 4.4792 },
        date: '2025-11-22',
        actual: true
      },
      pod: {
        location: { id: 8, name: 'Singapore', state: null, country: 'Singapore', country_code: 'SG', locode: 'SGSIN', lat: 1.3521, lng: 103.8198 },
        date: '2025-12-15',
        actual: false
      },
      postpod: {
        location: { id: 8, name: 'Singapore', state: null, country: 'Singapore', country_code: 'SG', locode: 'SGSIN', lat: 1.3521, lng: 103.8198 },
        date: '2025-12-17',
        actual: false
      }
    },
    vessels: [
      { id: 4, name: 'MAERSK ESSEX', imo: 9632511, call_sign: 'OXJL2', mmsi: 220654000, flag: 'DK' }
    ],
    containers: [
      {
        number: 'MAEU6543211',
        iso_code: '45G1',
        status: 'IN_TRANSIT',
        events: [
          {
            order_id: 1,
            location: { id: 7, name: 'Rotterdam', state: null, country: 'Netherlands', country_code: 'NL', locode: 'NLRTM', lat: 51.9225, lng: 4.4792 },
            state: 'Gate in',
            date: '2024-01-28T07:00:00Z',
            actual: true,
            voyage: 'MAE501E',
            vessel: 'MAERSK ESSEX'
          },
          {
            order_id: 2,
            location: { id: 7, name: 'Rotterdam', state: null, country: 'Netherlands', country_code: 'NL', locode: 'NLRTM', lat: 51.9225, lng: 4.4792 },
            state: 'Loaded',
            date: '2024-01-30T13:00:00Z',
            actual: true,
            voyage: 'MAE501E',
            vessel: 'MAERSK ESSEX'
          }
        ]
      }
    ],
    routePath: [
      [51.9225, 4.4792],    // Rotterdam
      [50.5, 2.5],          // North Sea
      [49.0, 0.0],          // English Channel
      [46.0, -4.0],         // Bay of Biscay
      [42.0, -8.0],         // Off Portugal
      [37.0, -9.0],         // Off Portugal
      [36.0, -6.0],         // Strait of Gibraltar
      [36.5, -2.0],         // Entering Med
      [37.5, 3.0],          // Western Med
      [38.0, 8.0],          // Central Med
      [36.5, 13.0],         // Central Med
      [35.0, 18.0],         // Eastern Med
      [33.5, 24.0],         // Eastern Med
      [32.0, 29.0],         // Approaching Suez
      [31.0, 32.3],         // Suez Canal North
      [30.0, 32.6],         // Suez Canal South
      [26.0, 34.5],         // Red Sea North
      [22.0, 38.0],         // Red Sea
      [18.0, 40.5],         // Red Sea
      [14.0, 42.5],         // Red Sea South
      [12.5, 43.5],         // Bab-el-Mandeb
      [11.0, 47.0],         // Gulf of Aden
      [10.0, 52.0],         // Arabian Sea
      [9.0, 58.0],          // Arabian Sea
      [8.0, 65.0],          // Arabian Sea
      [7.0, 72.0],          // Off India
      [6.5, 78.0],          // Off Sri Lanka West
      [6.0, 84.0],          // Off Sri Lanka East
      [5.0, 90.0],          // Bay of Bengal
      [4.0, 95.0],          // Andaman Sea
      [3.0, 98.0],          // Malacca Strait North
      [2.0, 101.0],         // Malacca Strait
      [1.3521, 103.8198]    // Singapore
    ],
    currentPosition: { lat: 15.8, lng: 72.3 },
    quantity: 289.7,
    eta: '2025-12-15'
  },
  {
    metadata: {
      type: 'BK',
      number: 'HAPAG987654',
      sealine: 'HLCU',
      sealine_name: 'Hapag-Lloyd',
      status: 'PENDING'
    },
    locations: [
      { id: 9, name: 'Hamburg', state: null, country: 'Germany', country_code: 'DE', locode: 'DEHAM', lat: 53.5511, lng: 9.9937 },
      { id: 10, name: 'Dubai', state: null, country: 'United Arab Emirates', country_code: 'AE', locode: 'AEDXB', lat: 25.2048, lng: 55.2708 }
    ],
    route: {
      prepol: {
        location: { id: 9, name: 'Hamburg', state: null, country: 'Germany', country_code: 'DE', locode: 'DEHAM', lat: 53.5511, lng: 9.9937 },
        date: '2024-02-05',
        actual: false
      },
      pol: {
        location: { id: 9, name: 'Hamburg', state: null, country: 'Germany', country_code: 'DE', locode: 'DEHAM', lat: 53.5511, lng: 9.9937 },
        date: '2024-02-08',
        actual: false
      },
      pod: {
        location: { id: 10, name: 'Dubai', state: null, country: 'United Arab Emirates', country_code: 'AE', locode: 'AEDXB', lat: 25.2048, lng: 55.2708 },
        date: '2024-02-25',
        actual: false
      },
      postpod: {
        location: { id: 10, name: 'Dubai', state: null, country: 'United Arab Emirates', country_code: 'AE', locode: 'AEDXB', lat: 25.2048, lng: 55.2708 },
        date: '2024-02-27',
        actual: false
      }
    },
    vessels: [
      { id: 5, name: 'HAPAG EXPRESS', imo: 9234567, call_sign: 'DJKL9', mmsi: 255805000, flag: 'PT' }
    ],
    containers: [
      {
        number: 'HLCU9876541',
        iso_code: '42G1',
        status: 'PENDING',
        events: []
      }
    ],
    routePath: [
      [53.5511, 9.9937],    // Hamburg
      [53.0, 8.0],          // North Sea
      [52.0, 4.0],          // North Sea
      [51.0, 2.0],          // English Channel approach
      [50.0, 0.0],          // English Channel
      [48.0, -3.0],         // Bay of Biscay
      [44.0, -7.0],         // Off Spain
      [40.0, -9.0],         // Off Portugal
      [36.5, -6.0],         // Strait of Gibraltar
      [36.5, -3.0],         // Entering Med
      [37.0, 1.0],          // Western Med
      [37.5, 6.0],          // Central Med
      [36.0, 12.0],         // Central Med
      [34.5, 18.0],         // Eastern Med
      [33.0, 24.0],         // Eastern Med
      [32.0, 28.5],         // Approaching Suez
      [31.0, 32.3],         // Suez Canal North
      [30.0, 32.6],         // Suez Canal South
      [28.0, 34.0],         // Red Sea North
      [25.0, 36.5],         // Red Sea
      [22.0, 38.5],         // Red Sea
      [18.0, 40.0],         // Red Sea
      [15.0, 42.0],         // Red Sea South
      [12.5, 43.5],         // Bab-el-Mandeb
      [13.0, 46.0],         // Gulf of Aden
      [14.0, 50.0],         // Arabian Sea
      [17.0, 53.0],         // Arabian Sea
      [22.0, 55.0],         // Arabian Gulf approach
      [25.2048, 55.2708]    // Dubai
    ],
    currentPosition: { lat: 53.5511, lng: 9.9937 },
    quantity: 198.5,
    eta: '2024-02-25'
  }
];

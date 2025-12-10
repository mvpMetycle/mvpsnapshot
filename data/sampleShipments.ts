// Sample shipment data with diverse states for demonstration
// These dates are relative to current date (Dec 2, 2025)

export interface SampleShipment {
  id: number;
  bl_number: string;
  bl_order_name: string;
  port_of_loading: string;
  port_of_discharge: string;
  loaded_quantity_mt: number;
  atd: string; // Actual Time of Departure
  eta: string; // Estimated Time of Arrival
  status: string;
}

// Current date: Dec 2, 2025
export const SAMPLE_SHIPMENTS: SampleShipment[] = [
  {
    // ON TIME - Long voyage, plenty of time left
    id: 1001,
    bl_number: "MEDUEB155202",
    bl_order_name: "28878-1",
    port_of_loading: "BEIRA PORT, MOZAMBIQUE",
    port_of_discharge: "SHANGHAI, CHINA",
    loaded_quantity_mt: 345.438,
    atd: "2025-10-28",
    eta: "2025-12-20", // 18 days left
    status: "ON BOARD",
  },
  {
    // ARRIVING SOON - 3 days left
    id: 1002,
    bl_number: "HDMUSCLA55371600",
    bl_order_name: "41468-1,2,3",
    port_of_loading: "SAN ANTONIO, CHILE",
    port_of_discharge: "HONG KONG",
    loaded_quantity_mt: 23.197,
    atd: "2025-10-14",
    eta: "2025-12-05", // 3 days left
    status: "ON BOARD",
  },
  {
    // ARRIVING SOON - 2 days left (Trans-Atlantic)
    id: 1003,
    bl_number: "COSLU72849501",
    bl_order_name: "11077-1,2",
    port_of_loading: "ROTTERDAM, NETHERLANDS",
    port_of_discharge: "NEW YORK, USA",
    loaded_quantity_mt: 156.75,
    atd: "2025-11-20",
    eta: "2025-12-04", // 2 days left
    status: "ON BOARD",
  },
  {
    // DELAYED - Past ETA, overdue
    id: 1004,
    bl_number: "MAEU8472910",
    bl_order_name: "22584-1,2",
    port_of_loading: "DURBAN, SOUTH AFRICA",
    port_of_discharge: "MUMBAI, INDIA",
    loaded_quantity_mt: 89.5,
    atd: "2025-10-01",
    eta: "2025-11-15", // 17 days overdue
    status: "ON BOARD",
  },
  {
    // ON TIME - Long trans-Pacific voyage
    id: 1005,
    bl_number: "MEDUXF621288",
    bl_order_name: "41048-1,2",
    port_of_loading: "VERACRUZ, MEXICO",
    port_of_discharge: "SHEKOU, CHINA",
    loaded_quantity_mt: 24.479,
    atd: "2025-11-08",
    eta: "2026-01-10", // 39 days left
    status: "ON BOARD",
  },
];

export function getSampleShipments(): SampleShipment[] {
  return SAMPLE_SHIPMENTS;
}

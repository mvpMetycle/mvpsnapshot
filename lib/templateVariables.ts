export interface TemplateVariable {
  key: string;
  label: string;
  path: string;
  format?: 'date' | 'number' | 'currency';
}

export interface VariableCategory {
  label: string;
  variables: TemplateVariable[];
}

export const TEMPLATE_VARIABLES: Record<string, VariableCategory> = {
  metycle: {
    label: "Metycle Company Info",
    variables: [
      { key: "metycle_name", label: "Company Name", path: "metycle.name" },
      { key: "metycle_address", label: "Address", path: "metycle.address" },
      { key: "metycle_city", label: "City", path: "metycle.city" },
      { key: "metycle_country", label: "Country", path: "metycle.country" },
      { key: "metycle_phone", label: "Phone", path: "metycle.phone" },
      { key: "metycle_email", label: "Email", path: "metycle.email" },
      { key: "metycle_managing_directors", label: "Managing Directors", path: "metycle.managing_directors" },
      { key: "metycle_register", label: "Company Register", path: "metycle.register" },
      { key: "metycle_vat_id", label: "VAT ID", path: "metycle.vat_id" },
      { key: "metycle_bank_1", label: "Bank 1 Name", path: "metycle.bank_1" },
      { key: "metycle_iban_1", label: "Bank 1 IBAN", path: "metycle.iban_1" },
      { key: "metycle_bic_1", label: "Bank 1 BIC", path: "metycle.bic_1" },
      { key: "metycle_bank_2", label: "Bank 2 Name", path: "metycle.bank_2" },
      { key: "metycle_iban_2", label: "Bank 2 IBAN", path: "metycle.iban_2" },
      { key: "metycle_bic_2", label: "Bank 2 BIC", path: "metycle.bic_2" },
      { key: "current_date", label: "Current Date", path: "current_date", format: "date" },
    ],
  },
  bl_extraction: {
    label: "Bill of Lading Information",
    variables: [
      { key: "bl_number", label: "BL Number", path: "bl_extraction.bl_number" },
      { key: "bl_issue_date", label: "BL Issue Date", path: "bl_extraction.bl_issue_date", format: "date" },
      { key: "vessel_name", label: "Vessel Name", path: "bl_extraction.vessel_name" },
      { key: "shipping_line", label: "Shipping Line", path: "bl_extraction.shipping_line" },
      { key: "shipper", label: "Shipper", path: "bl_extraction.shipper" },
      { key: "description_of_goods", label: "Description of Goods", path: "bl_extraction.description_of_goods" },
      { key: "product_description", label: "Product Description", path: "bl_extraction.product_description" },
      { key: "hs_code", label: "HS Code", path: "bl_extraction.hs_code" },
      { key: "country_of_origin", label: "Country of Origin", path: "bl_extraction.country_of_origin" },
      { key: "number_of_packages", label: "Number of Packages", path: "bl_extraction.number_of_packages" },
      { key: "number_of_containers", label: "Number of Containers", path: "bl_extraction.number_of_containers" },
      { key: "applicable_free_days", label: "Applicable Free Days", path: "bl_extraction.applicable_free_days" },
      { key: "total_net_weight", label: "Total Net Weight (KGS)", path: "bl_extraction.total_net_weight", format: "number" },
      { key: "total_gross_weight", label: "Total Gross Weight (KGS)", path: "bl_extraction.total_gross_weight", format: "number" },
    ],
  },
  bl_consignee: {
    label: "Consignee Information",
    variables: [
      { key: "consignee_name", label: "Consignee Name", path: "bl_extraction.consignee_name" },
      { key: "consignee_address", label: "Consignee Address", path: "bl_extraction.consignee_address" },
      { key: "consignee_contact_person_name", label: "Contact Person", path: "bl_extraction.consignee_contact_person_name" },
      { key: "consignee_contact_person_email", label: "Contact Email", path: "bl_extraction.consignee_contact_person_email" },
    ],
  },
  bl_notify: {
    label: "Notify Party Information",
    variables: [
      { key: "notify_name", label: "Notify Party Name", path: "bl_extraction.notify_name" },
      { key: "notify_address", label: "Notify Address", path: "bl_extraction.notify_address" },
      { key: "notify_contact_person_name", label: "Contact Person", path: "bl_extraction.notify_contact_person_name" },
      { key: "notify_contact_person_email", label: "Contact Email", path: "bl_extraction.notify_contact_person_email" },
    ],
  },
  bl_ports: {
    label: "Ports & Locations",
    variables: [
      { key: "port_of_loading", label: "Port of Loading", path: "bl_extraction.port_of_loading" },
      { key: "port_of_discharge", label: "Port of Discharge", path: "bl_extraction.port_of_discharge" },
      { key: "final_destination", label: "Final Destination", path: "bl_extraction.final_destination" },
    ],
  },
  bl_order: {
    label: "BL Order Details",
    variables: [
      { key: "bl_order_name", label: "BL Order Name", path: "bl_order.bl_order_name" },
      { key: "status", label: "Status", path: "bl_order.status" },
      { key: "loaded_quantity_mt", label: "Loaded Quantity (MT)", path: "bl_order.loaded_quantity_mt", format: "number" },
      { key: "total_quantity_mt", label: "Total Quantity (MT)", path: "bl_order.total_quantity_mt", format: "number" },
      { key: "loading_date", label: "Loading Date", path: "bl_order.loading_date", format: "date" },
      { key: "etd", label: "ETD", path: "bl_order.etd", format: "date" },
      { key: "eta", label: "ETA", path: "bl_order.eta", format: "date" },
      { key: "atd", label: "ATD", path: "bl_order.atd", format: "date" },
      { key: "ata", label: "ATA", path: "bl_order.ata", format: "date" },
    ],
  },
  bl_financial: {
    label: "BL Financial",
    variables: [
      { key: "buy_final_price", label: "Buy Final Price", path: "bl_order.buy_final_price", format: "currency" },
      { key: "sell_final_price", label: "Sell Final Price", path: "bl_order.sell_final_price", format: "currency" },
      { key: "revenue", label: "Revenue", path: "bl_order.revenue", format: "currency" },
      { key: "cost", label: "Cost", path: "bl_order.cost", format: "currency" },
    ],
  },
  order: {
    label: "Order Information",
    variables: [
      { key: "order_id", label: "Order ID", path: "order.id" },
      { key: "buyer", label: "Buyer", path: "order.buyer" },
      { key: "seller", label: "Seller", path: "order.seller" },
      { key: "commodity_type", label: "Commodity Type", path: "order.commodity_type" },
      { key: "isri_grade", label: "ISRI Grade", path: "order.isri_grade" },
      { key: "metal_form", label: "Metal Form", path: "order.metal_form" },
      { key: "product_details", label: "Product Details", path: "order.product_details" },
      { key: "ticket_product_details", label: "Ticket Product Details", path: "ticket.product_details" },
      { key: "allocated_quantity_mt", label: "Allocated Quantity (MT)", path: "order.allocated_quantity_mt", format: "number" },
      { key: "buy_price", label: "Buy Price", path: "order.buy_price", format: "currency" },
      { key: "sell_price", label: "Sell Price", path: "order.sell_price", format: "currency" },
      { key: "margin", label: "Margin", path: "order.margin", format: "number" },
      { key: "ship_from", label: "Ship From", path: "order.ship_from" },
      { key: "ship_to", label: "Ship To", path: "order.ship_to" },
      { key: "incoterms", label: "Incoterms", path: "order.incoterms" },
      { key: "payment_terms", label: "Payment Terms", path: "ticket.payment_terms" },
      { key: "formatted_payment_terms", label: "Formatted Payment Terms (with timing)", path: "computed.formatted_payment_terms" },
      { key: "created_at", label: "Created At", path: "order.created_at", format: "date" },
      { key: "sales_order_sign_date", label: "Sales Order Sign Date", path: "order.sales_order_sign_date", format: "date" },
    ],
  },
  company: {
    label: "Company/Purchaser Details",
    variables: [
      { key: "purchaser_name", label: "Purchaser Name", path: "company.name" },
      { key: "purchaser_address", label: "Purchaser Address", path: "company_address.line1" },
      { key: "purchaser_city", label: "Purchaser City", path: "company_address.city" },
      { key: "purchaser_country", label: "Purchaser Country", path: "company_address.country" },
      { key: "purchaser_vat", label: "Purchaser VAT", path: "company_address.VAT_id" },
      { key: "purchaser_contact", label: "Purchaser Contact", path: "company_address.contact_name_1" },
      { key: "purchaser_email", label: "Purchaser Email", path: "company_address.email_1" },
      { key: "purchaser_phone", label: "Purchaser Phone", path: "company_address.phone_1" },
    ],
  },
  containers: {
    label: "Containers (Repeating Section)",
    variables: [
      { key: "container_number", label: "Container Number", path: "container.container_number" },
      { key: "seal_number", label: "Seal Number", path: "container.seal_number" },
      { key: "net_weight", label: "Net Weight (KGS)", path: "container.net_weight", format: "number" },
      { key: "gross_weight", label: "Gross Weight (KGS)", path: "container.gross_weight", format: "number" },
    ],
  },
};

// Flatten all variables for quick search
export const ALL_VARIABLES = Object.values(TEMPLATE_VARIABLES).flatMap(
  (category) => category.variables
);

// Get variable by key
export function getVariableByKey(key: string): TemplateVariable | undefined {
  return ALL_VARIABLES.find((v) => v.key === key);
}

// Static Metycle company information
export const METYCLE_INFO = {
  name: "METYCLE GmbH",
  address: "Venloer Str. 301-303",
  city: "50823 Cologne",
  country: "Germany",
  phone: "+49 151 20244872",
  email: "operations@metycle.com",
  managing_directors: "Rafael Suchan, Sebastian Brenner",
  register: "Cologne, HRB 110770",
  vat_id: "DE354945597",
  bank_1: "Deutsche Bank",
  iban_1: "DE51 1007 0100 0327 4412 01",
  bic_1: "DEUTDEBB101",
  bank_2: "Sparkasse KölnBonn",
  iban_2: "DE17 3705 0198 1936 9898 11",
  bic_2: "COLSDE33XXX",
};

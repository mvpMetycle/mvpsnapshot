import { METYCLE_INFO } from "./templateVariables";

interface TemplateData {
  metycle?: any;
  bl_extraction?: any;
  bl_order?: any;
  order?: any;
  company?: any;
  company_address?: any;
  containers?: any[];
  ticket?: any;
}

/**
 * Template engine for replacing placeholders with actual data
 * Supports:
 * - Simple variables: {{variable_name}}
 * - Repeating sections: {{#containers}}...{{/containers}}
 */
export class TemplateEngine {
  private data: TemplateData;

  constructor(data: TemplateData) {
    this.data = {
      ...data,
      metycle: METYCLE_INFO,
    };
  }

  /**
   * Process template and replace all placeholders
   */
  process(template: string): string {
    // First, process repeating sections
    let result = this.processRepeatingSections(template);

    // Then, replace simple variables
    result = this.replaceVariables(result);

    return result;
  }

  /**
   * Process repeating sections like {{#containers}}...{{/containers}}
   */
  private processRepeatingSections(template: string): string {
    const sectionRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

    return template.replace(sectionRegex, (match, sectionName, sectionContent) => {
      const sectionData = this.data[sectionName as keyof TemplateData];

      if (!Array.isArray(sectionData)) {
        return ""; // Section data not found or not an array
      }

      // Repeat the section content for each item
      return sectionData
        .map((item) => {
          return sectionContent.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
            const value = item[varName];
            return this.formatValue(value);
          });
        })
        .join("");
    });
  }

  /**
   * Replace simple variables like {{variable_name}}
   */
  private replaceVariables(template: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      const value = this.resolveValue(varName);
      return this.formatValue(value);
    });
  }

  /**
   * Resolve variable value from nested data structure
   */
  private resolveValue(varName: string): any {
    // Handle current_date special variable
    if (varName === "current_date") {
      return new Date().toISOString().split('T')[0];
    }

    // Direct lookup first
    if (varName in this.data) {
      return (this.data as any)[varName];
    }

    // Handle prefixed variables (e.g., metycle_name -> look for 'name' in metycle object)
    const prefixMap = {
      'metycle_': 'metycle',
      'bl_': 'bl_extraction',
      'bl_order_': 'bl_order',
      'order_': 'order',
      'purchaser_': 'company',
      'seller_': 'company',
      'buyer_': 'company',
    };

    for (const [prefix, sourceName] of Object.entries(prefixMap)) {
      if (varName.startsWith(prefix)) {
        const fieldName = varName.substring(prefix.length);
        const source = (this.data as any)[sourceName];
        if (source && fieldName in source) {
          return source[fieldName];
        }
      }
    }

    // Check in each data source directly
    const sources = [
      this.data.metycle,
      this.data.bl_extraction,
      this.data.bl_order,
      this.data.order,
      this.data.company,
      this.data.company_address,
    ];

    for (const source of sources) {
      if (source && varName in source) {
        return source[varName];
      }
    }

    // Handle special computed fields
    if (varName === "total_sell_value" && this.data.order) {
      const qty = this.data.order.allocated_quantity_mt || 0;
      const price = this.data.order.sell_price || 0;
      return qty * price;
    }

    if (varName === "total_buy_value" && this.data.order) {
      const qty = this.data.order.allocated_quantity_mt || 0;
      const price = this.data.order.buy_price || 0;
      return qty * price;
    }

    // Handle formatted payment terms: combines payment_terms + payment_trigger_event + payment_offset_days
    if (varName === "formatted_payment_terms" && this.data.ticket) {
      const paymentTerms = this.data.ticket.payment_terms || "";
      const triggerEvent = this.data.ticket.payment_trigger_event || "";
      const offsetDays = this.data.ticket.payment_offset_days;
      
      if (paymentTerms && triggerEvent && offsetDays !== null && offsetDays !== undefined) {
        const absOffset = Math.abs(Number(offsetDays));
        const timing = Number(offsetDays) < 0 ? "before" : "after";
        return `${paymentTerms}, ${absOffset} days ${timing} ${triggerEvent}`;
      }
      return paymentTerms;
    }

    // Handle formatted basis with payable percent: "3M LLME 57%"
    if (varName === "basis_with_payable" && this.data.ticket) {
      const basis = this.data.ticket.basis || "";
      const payablePercent = this.data.ticket.payable_percent;
      
      if (basis && payablePercent !== null && payablePercent !== undefined) {
        // Convert decimal to percentage (0.57 -> 57, or if already >1 use as-is)
        const percentValue = Number(payablePercent) > 1.5 ? Number(payablePercent) : Number(payablePercent) * 100;
        return `${basis} ${Math.round(percentValue)}%`;
      }
      return basis;
    }

    // Handle ticket fields directly
    if (varName === "ticket_product_details" && this.data.ticket) {
      return this.data.ticket.product_details;
    }
    
    if (varName === "payment_terms" && this.data.ticket) {
      return this.data.ticket.payment_terms;
    }

    // Handle company address aliases
    if (varName === "buyer_address" && this.data.company_address) {
      return this.data.company_address.line1;
    }

    if (varName === "seller_address" && this.data.company_address) {
      return this.data.company_address.line1;
    }
    
    if (varName === "purchaser_address" && this.data.company_address) {
      return this.data.company_address.line1;
    }
    
    // Handle contact person aliases
    if (varName === "seller_contact_name" && this.data.company_address) {
      return this.data.company_address.contact_name_1;
    }
    
    if (varName === "seller_contact_email" && this.data.company_address) {
      return this.data.company_address.email_1;
    }
    
    if (varName === "purchaser_contact_name" && this.data.company_address) {
      return this.data.company_address.contact_name_1;
    }
    
    if (varName === "purchaser_contact_email" && this.data.company_address) {
      return this.data.company_address.email_1;
    }
    
    if (varName === "purchaser_vat" && this.data.company_address) {
      return this.data.company_address.VAT_id;
    }

    // Handle city/country aliases
    if ((varName === "seller_city" || varName === "purchaser_city") && this.data.company_address) {
      return this.data.company_address.city;
    }
    
    if ((varName === "seller_country" || varName === "purchaser_country") && this.data.company_address) {
      return this.data.company_address.country;
    }

    return undefined;
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return "—";
    }

    if (typeof value === "number") {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }

    if (value instanceof Date) {
      return value.toLocaleDateString("en-US");
    }

    // Handle date strings
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US");
      }
    }

    return String(value);
  }

  /**
   * Preview template with sample data (static method)
   */
  static previewTemplate(template: string): string {
    const engine = new TemplateEngine(TemplateEngine.getSampleData());
    return engine.process(template);
  }

  /**
   * Generate sample data for preview
   */
  static getSampleData(): TemplateData {
    return {
      metycle: METYCLE_INFO,
      bl_extraction: {
        bl_number: "SAMPLE-BL-12345",
        bl_issue_date: new Date().toISOString().split("T")[0],
        vessel_name: "SAMPLE VESSEL",
        shipping_line: "Sample Shipping Line",
        shipper: "Sample Shipper Company\n123 Export Street\nExport City, Country",
        consignee_name: "Sample Consignee",
        consignee_address: "456 Import Avenue\nImport City, Country",
        consignee_contact_person_name: "John Doe",
        consignee_contact_person_email: "john@example.com",
        notify_name: "Sample Notify Party",
        notify_address: "789 Notify Road\nNotify City, Country",
        notify_contact_person_name: "Jane Smith",
        notify_contact_person_email: "jane@example.com",
        description_of_goods: "Aluminium Scrap",
        product_description: "HMS 1&2 80/20",
        hs_code: "7602.00.00",
        country_of_origin: "Germany",
        port_of_loading: "Hamburg, Germany",
        port_of_discharge: "Shanghai, China",
        final_destination: "Shanghai, China",
        number_of_packages: 20,
        number_of_containers: 2,
        applicable_free_days: 7,
        total_net_weight: 40000,
        total_gross_weight: 42000,
      },
      bl_order: {
        bl_order_name: "28878-1",
        status: "In Transit",
        loaded_quantity_mt: 40,
        total_quantity_mt: 40,
        loading_date: new Date().toISOString().split("T")[0],
        etd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        eta: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        buy_final_price: 450,
        sell_final_price: 520,
        revenue: 2800,
        cost: 18000,
      },
      order: {
        id: "ORD-2024-001",
        buyer: "Sample Buyer Company",
        seller: "Sample Seller Company",
        commodity_type: "Aluminium",
        isri_grade: "Tense",
        metal_form: "Baled",
        product_details: "Aluminium extrusions, clean",
        allocated_quantity_mt: 40,
        buy_price: 450,
        sell_price: 520,
        margin: 15.56,
        ship_from: "Hamburg, Germany",
        ship_to: "Shanghai, China",
        incoterms: "FOB",
        created_at: new Date().toISOString().split("T")[0],
        sales_order_sign_date: new Date().toISOString().split("T")[0],
      },
      company: {
        name: "Sample Company Ltd",
      },
      company_address: {
        line1: "123 Business Park",
        city: "Business City",
        country: "Sample Country",
        VAT_id: "VAT123456789",
        contact_name_1: "Contact Person",
        email_1: "contact@sample.com",
        phone_1: "+1234567890",
      },
      ticket: {
        payment_terms: "100% CAD",
        payment_trigger_event: "ETA",
        payment_offset_days: -7,
        product_details: "Aluminium extrusions, clean, min 95% purity",
        currency: "USD",
        transport_method: "Sea",
        country_of_origin: "Germany",
        incoterms: "FOB",
        basis: "3M LLME",
        payable_percent: 0.57,
      },
      containers: [
        {
          container_number: "CONT123456",
          seal_number: "SEAL789012",
          net_weight: 20000,
          gross_weight: 21000,
        },
        {
          container_number: "CONT654321",
          seal_number: "SEAL210987",
          net_weight: 20000,
          gross_weight: 21000,
        },
      ],
    };
  }
}

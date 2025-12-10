-- Create document_templates table
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create generated_documents table
CREATE TABLE public.generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.document_templates(id) ON DELETE CASCADE,
  bl_order_id bigint REFERENCES public.bl_order(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  document_url text,
  generated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Anyone can view templates" ON public.document_templates
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert templates" ON public.document_templates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update templates" ON public.document_templates
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete templates" ON public.document_templates
  FOR DELETE USING (true);

-- RLS policies for generated_documents
CREATE POLICY "Anyone can view generated documents" ON public.generated_documents
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert generated documents" ON public.generated_documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete generated documents" ON public.generated_documents
  FOR DELETE USING (true);

-- Insert pre-built templates
INSERT INTO public.document_templates (name, description, category, content, is_active) VALUES
('Packing List', 'Standard packing list for shipments', 'Shipping', 
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
    <p style="margin: 5px 0;">Tel: {{metycle_phone}} | Email: {{metycle_email}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">PACKING LIST</h2>

  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>BL Number:</strong></td><td>{{bl_number}}</td></tr>
    <tr><td><strong>Date:</strong></td><td>{{bl_issue_date}}</td></tr>
    <tr><td><strong>Vessel:</strong></td><td>{{vessel_name}}</td></tr>
  </table>

  <h3>Shipper</h3>
  <p>{{shipper}}</p>

  <h3>Consignee</h3>
  <p>{{consignee_name}}<br>{{consignee_address}}<br>Contact: {{consignee_contact_person_name}}<br>Email: {{consignee_contact_person_email}}</p>

  <h3>Shipping Information</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Port of Loading:</strong></td><td>{{port_of_loading}}</td></tr>
    <tr><td><strong>Port of Discharge:</strong></td><td>{{port_of_discharge}}</td></tr>
    <tr><td><strong>Final Destination:</strong></td><td>{{final_destination}}</td></tr>
  </table>

  <h3>Cargo Description</h3>
  <p><strong>Description:</strong> {{description_of_goods}}</p>
  <p><strong>HS Code:</strong> {{hs_code}}</p>
  <p><strong>Country of Origin:</strong> {{country_of_origin}}</p>

  <h3>Container Details</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 8px;">Container Number</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Seal Number</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Net Weight (KGS)</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Gross Weight (KGS)</th>
      </tr>
    </thead>
    <tbody>
      {{#containers}}
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">{{container_number}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{seal_number}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{net_weight}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{gross_weight}}</td>
      </tr>
      {{/containers}}
    </tbody>
  </table>

  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Total Packages:</strong></td><td>{{number_of_packages}}</td></tr>
    <tr><td><strong>Total Net Weight:</strong></td><td>{{total_net_weight}} KGS</td></tr>
    <tr><td><strong>Total Gross Weight:</strong></td><td>{{total_gross_weight}} KGS</td></tr>
  </table>
</div>', true),

('Certificate of Origin', 'Certificate of Origin for customs', 'Certificates', 
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">CERTIFICATE OF ORIGIN</h2>

  <p style="margin: 20px 0;">This is to certify that the goods described below:</p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="width: 30%; padding: 8px;"><strong>BL Number:</strong></td><td style="padding: 8px;">{{bl_number}}</td></tr>
    <tr><td style="padding: 8px;"><strong>Description:</strong></td><td style="padding: 8px;">{{description_of_goods}}</td></tr>
    <tr><td style="padding: 8px;"><strong>HS Code:</strong></td><td style="padding: 8px;">{{hs_code}}</td></tr>
    <tr><td style="padding: 8px;"><strong>Quantity:</strong></td><td style="padding: 8px;">{{total_net_weight}} KGS</td></tr>
  </table>

  <p style="margin: 20px 0;">Were produced/manufactured in:</p>
  <p style="font-size: 20px; font-weight: bold; text-align: center;">{{country_of_origin}}</p>

  <table style="width: 100%; margin: 30px 0;">
    <tr><td style="width: 30%;"><strong>Exporter:</strong></td><td>{{shipper}}</td></tr>
    <tr><td><strong>Consignee:</strong></td><td>{{consignee_name}}</td></tr>
    <tr><td><strong>Port of Loading:</strong></td><td>{{port_of_loading}}</td></tr>
    <tr><td><strong>Port of Discharge:</strong></td><td>{{port_of_discharge}}</td></tr>
    <tr><td><strong>Vessel:</strong></td><td>{{vessel_name}}</td></tr>
  </table>

  <p style="margin-top: 60px;">Date: {{bl_issue_date}}</p>
  <p style="margin-top: 40px;">_________________________</p>
  <p>Authorized Signature</p>
</div>', true),

('Non-Radioactive Certificate', 'Non-radioactive material certification', 'Certificates',
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">NON-RADIOACTIVE CERTIFICATE</h2>

  <p style="margin: 20px 0;">We hereby certify that the materials described below are non-radioactive and safe for international transport:</p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="width: 30%; padding: 8px;"><strong>BL Number:</strong></td><td style="padding: 8px;">{{bl_number}}</td></tr>
    <tr><td style="padding: 8px;"><strong>Description:</strong></td><td style="padding: 8px;">{{description_of_goods}}</td></tr>
    <tr><td style="padding: 8px;"><strong>Net Weight:</strong></td><td style="padding: 8px;">{{total_net_weight}} KGS</td></tr>
    <tr><td style="padding: 8px;"><strong>Gross Weight:</strong></td><td style="padding: 8px;">{{total_gross_weight}} KGS</td></tr>
  </table>

  <h3>Container Details</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 8px;">Container Number</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Seal Number</th>
      </tr>
    </thead>
    <tbody>
      {{#containers}}
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">{{container_number}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{seal_number}}</td>
      </tr>
      {{/containers}}
    </tbody>
  </table>

  <p style="margin: 30px 0;">We certify that the above materials have been tested and contain no radioactive substances above natural background levels.</p>

  <table style="width: 100%; margin: 30px 0;">
    <tr><td style="width: 30%;"><strong>Shipper:</strong></td><td>{{shipper}}</td></tr>
    <tr><td><strong>Vessel:</strong></td><td>{{vessel_name}}</td></tr>
    <tr><td><strong>Date:</strong></td><td>{{bl_issue_date}}</td></tr>
  </table>

  <p style="margin-top: 60px;">_________________________</p>
  <p>Authorized Signature</p>
</div>', true),

('Freight Certificate', 'Freight and shipping certificate', 'Shipping',
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">FREIGHT CERTIFICATE</h2>

  <table style="width: 100%; margin: 30px 0;">
    <tr><td style="width: 30%;"><strong>BL Number:</strong></td><td>{{bl_number}}</td></tr>
    <tr><td><strong>Date of Issue:</strong></td><td>{{bl_issue_date}}</td></tr>
    <tr><td><strong>Shipping Line:</strong></td><td>{{shipping_line}}</td></tr>
    <tr><td><strong>Vessel Name:</strong></td><td>{{vessel_name}}</td></tr>
  </table>

  <h3>Shipper</h3>
  <p>{{shipper}}</p>

  <h3>Consignee</h3>
  <p>{{consignee_name}}<br>{{consignee_address}}</p>

  <h3>Notify Party</h3>
  <p>{{notify_name}}<br>{{notify_address}}</p>

  <h3>Shipping Route</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Port of Loading:</strong></td><td>{{port_of_loading}}</td></tr>
    <tr><td><strong>Port of Discharge:</strong></td><td>{{port_of_discharge}}</td></tr>
    <tr><td><strong>Final Destination:</strong></td><td>{{final_destination}}</td></tr>
  </table>

  <h3>Cargo Details</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Description:</strong></td><td>{{description_of_goods}}</td></tr>
    <tr><td><strong>Number of Containers:</strong></td><td>{{number_of_containers}}</td></tr>
    <tr><td><strong>Total Weight:</strong></td><td>{{total_gross_weight}} KGS</td></tr>
  </table>

  <p style="margin-top: 60px;">This certifies that the above cargo has been received for shipment.</p>
  <p style="margin-top: 40px;">_________________________</p>
  <p>Authorized Signature</p>
</div>', true),

('BLI Template', 'Bill of Lading Instruction template', 'Shipping',
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">BILL OF LADING INSTRUCTION</h2>

  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Reference:</strong></td><td>{{bl_order_name}}</td></tr>
    <tr><td><strong>Date:</strong></td><td>{{bl_issue_date}}</td></tr>
  </table>

  <h3>Shipper</h3>
  <p>{{shipper}}</p>

  <h3>Consignee</h3>
  <p>{{consignee_name}}<br>{{consignee_address}}<br>Contact: {{consignee_contact_person_name}}<br>Email: {{consignee_contact_person_email}}</p>

  <h3>Notify Party</h3>
  <p>{{notify_name}}<br>{{notify_address}}<br>Contact: {{notify_contact_person_name}}<br>Email: {{notify_contact_person_email}}</p>

  <h3>Vessel & Voyage</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Vessel:</strong></td><td>{{vessel_name}}</td></tr>
    <tr><td><strong>Port of Loading:</strong></td><td>{{port_of_loading}}</td></tr>
    <tr><td><strong>Port of Discharge:</strong></td><td>{{port_of_discharge}}</td></tr>
    <tr><td><strong>Final Destination:</strong></td><td>{{final_destination}}</td></tr>
  </table>

  <h3>Cargo Description</h3>
  <p><strong>Description of Goods:</strong> {{description_of_goods}}</p>
  <p><strong>HS Code:</strong> {{hs_code}}</p>
  <p><strong>Number of Packages:</strong> {{number_of_packages}}</p>

  <h3>Container & Weight Details</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f0f0f0;">
        <th style="border: 1px solid #ddd; padding: 8px;">Container Number</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Seal Number</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Net Weight (KGS)</th>
        <th style="border: 1px solid #ddd; padding: 8px;">Gross Weight (KGS)</th>
      </tr>
    </thead>
    <tbody>
      {{#containers}}
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">{{container_number}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{seal_number}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{net_weight}}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">{{gross_weight}}</td>
      </tr>
      {{/containers}}
    </tbody>
  </table>

  <p><strong>Total Net Weight:</strong> {{total_net_weight}} KGS</p>
  <p><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</p>

  <p style="margin-top: 40px;">Please issue Bill of Lading as per above instructions.</p>
</div>', true),

('Sales Order', 'Sales order template', 'Commercial',
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">SALES ORDER</h2>

  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Order ID:</strong></td><td>{{order_id}}</td></tr>
    <tr><td><strong>Date:</strong></td><td>{{sales_order_sign_date}}</td></tr>
  </table>

  <h3>Seller (Metycle)</h3>
  <p>{{metycle_name}}<br>{{metycle_address}}<br>{{metycle_city}}, {{metycle_country}}</p>

  <h3>Buyer</h3>
  <p>{{buyer}}<br>{{buyer_address}}</p>

  <h3>Product Details</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Commodity:</strong></td><td>{{commodity_type}}</td></tr>
    <tr><td><strong>Grade:</strong></td><td>{{isri_grade}}</td></tr>
    <tr><td><strong>Form:</strong></td><td>{{metal_form}}</td></tr>
    <tr><td><strong>Details:</strong></td><td>{{product_details}}</td></tr>
  </table>

  <h3>Quantity & Pricing</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Quantity:</strong></td><td>{{allocated_quantity_mt}} MT</td></tr>
    <tr><td><strong>Price per MT:</strong></td><td>{{sell_price}} {{currency}}</td></tr>
    <tr><td><strong>Total Value:</strong></td><td>{{total_sell_value}} {{currency}}</td></tr>
  </table>

  <h3>Shipping Terms</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Ship From:</strong></td><td>{{ship_from}}</td></tr>
    <tr><td><strong>Ship To:</strong></td><td>{{ship_to}}</td></tr>
    <tr><td><strong>Incoterms:</strong></td><td>{{incoterms}}</td></tr>
  </table>

  <p style="margin-top: 60px;">_________________________</p>
  <p>Authorized Signature (Seller)</p>
</div>', true),

('Purchase Order', 'Purchase order template', 'Commercial',
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0;">{{metycle_name}}</h1>
    <p style="margin: 5px 0;">{{metycle_address}}</p>
    <p style="margin: 5px 0;">{{metycle_city}}, {{metycle_country}}</p>
  </div>

  <h2 style="text-align: center; text-decoration: underline;">PURCHASE ORDER</h2>

  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Order ID:</strong></td><td>{{order_id}}</td></tr>
    <tr><td><strong>Date:</strong></td><td>{{created_at}}</td></tr>
  </table>

  <h3>Buyer (Metycle)</h3>
  <p>{{metycle_name}}<br>{{metycle_address}}<br>{{metycle_city}}, {{metycle_country}}</p>

  <h3>Seller</h3>
  <p>{{seller}}<br>{{seller_address}}</p>

  <h3>Product Details</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Commodity:</strong></td><td>{{commodity_type}}</td></tr>
    <tr><td><strong>Grade:</strong></td><td>{{isri_grade}}</td></tr>
    <tr><td><strong>Form:</strong></td><td>{{metal_form}}</td></tr>
    <tr><td><strong>Details:</strong></td><td>{{product_details}}</td></tr>
  </table>

  <h3>Quantity & Pricing</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Quantity:</strong></td><td>{{allocated_quantity_mt}} MT</td></tr>
    <tr><td><strong>Price per MT:</strong></td><td>{{buy_price}} {{currency}}</td></tr>
    <tr><td><strong>Total Value:</strong></td><td>{{total_buy_value}} {{currency}}</td></tr>
  </table>

  <h3>Shipping Terms</h3>
  <table style="width: 100%; margin: 20px 0;">
    <tr><td style="width: 30%;"><strong>Ship From:</strong></td><td>{{ship_from}}</td></tr>
    <tr><td><strong>Ship To:</strong></td><td>{{ship_to}}</td></tr>
    <tr><td><strong>Incoterms:</strong></td><td>{{incoterms}}</td></tr>
  </table>

  <p style="margin-top: 60px;">_________________________</p>
  <p>Authorized Signature (Buyer)</p>
</div>', true);
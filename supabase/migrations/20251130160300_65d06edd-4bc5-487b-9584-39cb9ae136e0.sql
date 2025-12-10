-- Update Non-Radioactive Certificate to include No War certification

UPDATE document_templates
SET 
  name = 'Non-Radioactive and No War Certificate',
  content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Non Radioactive and No War Certificate</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #e5e5e5; padding: 20px; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto; background: #ffffff; display: flex; flex-direction: column; border: 1px solid #ccc; }
    .top-bar { background: #245356; color: #ffffff; padding: 18px 35px; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-transform: lowercase; }
    .logo-text { font-size: 26px; font-weight: 700; text-transform: lowercase; letter-spacing: 1px; }
    .top-address { text-align: right; font-size: 11px; line-height: 1.4; white-space: pre-line; }
    .content { flex: 1; padding: 40px 45px 60px; font-size: 12px; color: #000000; }
    .main-title { font-size: 28px; font-weight: 700; color: #255659; margin-bottom: 20px; }
    .date-line { font-size: 12px; margin-bottom: 30px; font-weight: 600; }
    .section { margin-bottom: 25px; }
    .section-header { font-size: 16px; font-weight: 700; color: #255659; margin-bottom: 12px; }
    .section-content { font-size: 12px; line-height: 1.6; }
    .section-content p { margin-bottom: 4px; }
    .cert-statement { background: #f0f9fa; padding: 20px; margin: 25px 0; border-left: 4px solid #245356; font-weight: 500; line-height: 1.8; text-align: justify; }
    .shipment-details p { margin-bottom: 6px; }
    .digital-notice { margin-top: 30px; font-style: italic; color: #666; }
    .bottom-bar { background: #393939; color: #ffffff; padding: 18px 35px 20px; font-size: 10px; }
    .footer-columns { display: flex; justify-content: space-between; gap: 20px; }
    .footer-col { width: 33%; line-height: 1.6; white-space: pre-line; }
  </style>
</head>
<body>
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">{{metycle_name}}  {{metycle_address}}
{{metycle_city}}  {{metycle_country}}</div>
    </header>
    <main class="content">
      <div class="main-title">Non Radioactive and No War Certificate</div>
      <div class="date-line">Date: {{current_date}}</div>

      <div class="section">
        <div class="section-header">Buyer Details</div>
        <div class="section-content">
          <p>{{consignee_name}}</p>
          <p>{{consignee_address}}</p>
          <p>I.E CODE - -</p>
          <p>GST No - -</p>
          <p>PAN NUM - -</p>
        </div>
      </div>

      <div class="cert-statement">
        This is to certify that the below sold materials does not contain any types of arms, ammunition, mines, shells, cartridges, radioactive contaminated or any other explosive materials in any form either used or otherwise. The exported item is actually a metallic scrap as per the internationally accepted parameters for such classification.
      </div>

      <div class="section">
        <div class="section-header">Shipment Details</div>
        <div class="shipment-details">
          <p><strong>Document No:</strong> {{bl_number}}</p>
          <p><strong>Invoice No:</strong> {{bl_order_name}}</p>
          <p><strong>Deal No:</strong> {{order_id}}</p>
          <p><strong>Bill Of Lading No:</strong> {{bl_number}}</p>
          <p><strong>Total Net Weight:</strong> {{total_net_weight}}</p>
          <p><strong>Shipping Line:</strong> {{shipping_line}}</p>
          <p><strong>Container Numbers:</strong> {{#containers}}{{container_number}}{{#unless @last}}, {{/unless}}{{/containers}}</p>
          <p><strong>Port Of Loading:</strong> {{port_of_loading}}</p>
          <p><strong>Port Of Discharge:</strong> {{port_of_discharge}}</p>
          <p><strong>Place Of Delivery:</strong> {{final_destination}}</p>
        </div>
      </div>

      <div class="digital-notice">
        This is a digital document and needs no signature.
      </div>
    </main>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">{{metycle_name}}
{{metycle_address}} | {{metycle_city}}, {{metycle_country}}
Managing Directors: {{metycle_managing_directors}}
Company Register: {{metycle_register}}
VAT-ID: {{metycle_vat_id}}</div>
        <div class="footer-col">Bank: {{metycle_bank_1}}
IBAN: {{metycle_iban_1}}
BIC: {{metycle_bic_1}}
Bank: {{metycle_bank_2}}
IBAN: {{metycle_iban_2}}
BIC: {{metycle_bic_2}}</div>
        <div class="footer-col">Phone: {{metycle_phone}}
E-Mail: {{metycle_email}}
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>
</body>
</html>'
WHERE name = 'Non-Radioactive Certificate';
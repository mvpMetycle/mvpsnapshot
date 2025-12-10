-- Update all 7 document templates with professional A4 styling

-- 1. Packing List
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Packing List</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 48%; font-size: 12px; line-height: 1.6; }
    .party h2 { font-size: 16px; margin-bottom: 15px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .totals { margin-top: 20px; text-align: right; font-size: 12px; line-height: 1.8; }
    .totals strong { font-weight: 700; }
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
      <div class="title-row">
        <div class="main-title">Packing List</div>
        <div class="title-meta">
          <div><span class="label">BL Number:</span> {{bl_number}}</div>
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h2>Shipper</h2>
          <p>{{shipper}}</p>
        </div>
        <div class="party">
          <h2>Consignee</h2>
          <p>{{consignee_name}}</p>
          <p>{{consignee_address}}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Container No.</th>
            <th>Seal No.</th>
            <th>Net Weight (KGS)</th>
            <th>Gross Weight (KGS)</th>
          </tr>
        </thead>
        <tbody>
          {{#containers}}
          <tr>
            <td>{{container_number}}</td>
            <td>{{seal_number}}</td>
            <td>{{net_weight}}</td>
            <td>{{gross_weight}}</td>
          </tr>
          {{/containers}}
        </tbody>
      </table>
      <div class="totals">
        <div><strong>Total Net Weight:</strong> {{total_net_weight}} KGS</div>
        <div><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</div>
        <div><strong>Total Containers:</strong> {{number_of_containers}}</div>
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
WHERE name = 'Packing List';

-- 2. Certificate of Origin
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Origin</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .cert-statement { margin: 30px 0; font-size: 13px; line-height: 1.8; text-align: justify; }
    .goods-section { margin: 25px 0; }
    .goods-section h3 { font-size: 14px; font-weight: 700; color: #255659; margin-bottom: 10px; }
    .goods-section p { margin-bottom: 8px; line-height: 1.6; }
    .country-highlight { background: #f0f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #245356; }
    .country-highlight strong { color: #245356; font-size: 14px; }
    .signature-block { margin-top: 50px; }
    .signature-line { margin-top: 60px; border-top: 2px solid #000; width: 300px; padding-top: 8px; }
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
      <div class="title-row">
        <div class="main-title">Certificate of Origin</div>
        <div class="title-meta">
          <div><span class="label">BL Number:</span> {{bl_number}}</div>
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="cert-statement">
        <p>This is to certify that the goods described below were produced, manufactured, or processed in the country specified and comply with the origin requirements of that country.</p>
      </div>
      <div class="goods-section">
        <h3>Goods Description</h3>
        <p><strong>Description:</strong> {{description_of_goods}}</p>
        <p><strong>Product:</strong> {{product_description}}</p>
        <p><strong>HS Code:</strong> {{hs_code}}</p>
        <p><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</p>
        <p><strong>Total Net Weight:</strong> {{total_net_weight}} KGS</p>
        <p><strong>Number of Containers:</strong> {{number_of_containers}}</p>
      </div>
      <div class="country-highlight">
        <p><strong>Country of Origin: {{country_of_origin}}</strong></p>
      </div>
      <div class="goods-section">
        <h3>Consignee</h3>
        <p>{{consignee_name}}</p>
        <p>{{consignee_address}}</p>
      </div>
      <div class="signature-block">
        <p>We hereby certify the above information is true and correct.</p>
        <div class="signature-line">
          <p><strong>{{metycle_name}}</strong></p>
          <p>Authorized Signature</p>
        </div>
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
WHERE name = 'Certificate of Origin';

-- 3. Non-Radioactive Certificate
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Non-Radioactive Certificate</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .letter-body { font-size: 12px; line-height: 1.8; }
    .letter-body p { margin-bottom: 12px; }
    .cert-highlight { background: #f0f9fa; padding: 20px; margin: 25px 0; border-left: 4px solid #245356; font-weight: 600; text-align: center; color: #245356; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .signature-block { margin-top: 50px; }
    .signature-line { margin-top: 60px; border-top: 2px solid #000; width: 300px; padding-top: 8px; }
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
      <div class="title-row">
        <div class="main-title">Non-Radioactive Certificate</div>
        <div class="title-meta">
          <div><span class="label">BL Number:</span> {{bl_number}}</div>
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="letter-body">
        <p>To Whom It May Concern,</p>
        <p>This is to certify that the material described below has been tested and found to be non-radioactive and safe for international transport and handling.</p>
        <div class="cert-highlight">
          The following shipment does NOT contain any radioactive materials
        </div>
        <h3 style="margin-top: 20px; margin-bottom: 10px; color: #255659;">Shipment Details</h3>
        <p><strong>BL Number:</strong> {{bl_number}}</p>
        <p><strong>Description of Goods:</strong> {{description_of_goods}}</p>
        <p><strong>Product:</strong> {{product_description}}</p>
        <p><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</p>
        <p><strong>Number of Containers:</strong> {{number_of_containers}}</p>
        <table>
          <thead>
            <tr>
              <th>Container No.</th>
              <th>Seal No.</th>
              <th>Gross Weight (KGS)</th>
            </tr>
          </thead>
          <tbody>
            {{#containers}}
            <tr>
              <td>{{container_number}}</td>
              <td>{{seal_number}}</td>
              <td>{{gross_weight}}</td>
            </tr>
            {{/containers}}
          </tbody>
        </table>
        <p>We confirm that all materials comply with international safety standards and regulations for non-radioactive materials.</p>
      </div>
      <div class="signature-block">
        <div class="signature-line">
          <p><strong>{{metycle_name}}</strong></p>
          <p>Authorized Signature</p>
        </div>
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

-- 4. Freight Certificate
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Freight Certificate</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 48%; font-size: 12px; line-height: 1.6; }
    .party h2 { font-size: 16px; margin-bottom: 15px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 2px; }
    .letter-body { font-size: 12px; line-height: 1.8; }
    .letter-body p { margin-bottom: 12px; }
    .shipment-header { margin-top: 25px; margin-bottom: 10px; font-weight: 700; text-decoration: underline; }
    .shipment-details p { margin-bottom: 6px; }
    .separator { margin: 25px 0 20px; }
    .closing p { margin-bottom: 12px; }
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
      <div class="title-row">
        <div class="main-title">Freight Certificate</div>
        <div class="title-meta">
          <div><span class="label">Order number:</span> {{bl_order_name}}</div>
          <div><span class="label">Document date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h2>Shipper</h2>
          <p>{{metycle_name}}</p>
          <p>{{metycle_address}}</p>
          <p>{{metycle_city}} - {{metycle_country}}</p>
          <p>Contact: {{metycle_email}}</p>
          <p>Phone: {{metycle_phone}}</p>
        </div>
        <div class="party">
          <h2>Purchaser</h2>
          <p>{{consignee_name}}</p>
          <p>{{consignee_address}}</p>
        </div>
      </div>
      <div class="letter-body">
        <p>Dear Sir or Madame,</p>
        <p>This is to certify that we have paid {{shipping_line}} for the below Shipment</p>
        <div class="shipment-header">SHIPMENT DETAILS</div>
        <div class="shipment-details">
          <p>Bill of Lading Number: {{bl_number}}</p>
          <p>Vessel Name: {{vessel_name}}</p>
          <p>Port of Loading: {{port_of_loading}}</p>
          <p>Port of Discharge: {{port_of_discharge}}</p>
          <p>Place of Delivery: {{final_destination}}</p>
        </div>
        <div class="separator">---</div>
        <div class="closing">
          <p>Thank you for this business.</p>
          <p>We hope to do more business with your company in the near future.</p>
          <br />
          <p>Best regards,</p>
          <br />
          <p>{{metycle_name}}</p>
        </div>
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
WHERE name = 'Freight Certificate';

-- 5. BLI Template
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Bill of Lading Instructions</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .section { margin-bottom: 30px; }
    .section h3 { font-size: 14px; font-weight: 700; color: #255659; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #245356; }
    .section p { margin-bottom: 6px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
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
      <div class="title-row">
        <div class="main-title">Bill of Lading Instructions</div>
        <div class="title-meta">
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="section">
        <h3>Shipper Details</h3>
        <p>{{shipper}}</p>
      </div>
      <div class="section">
        <h3>Consignee Details</h3>
        <p><strong>Name:</strong> {{consignee_name}}</p>
        <p><strong>Address:</strong> {{consignee_address}}</p>
        <p><strong>Contact:</strong> {{consignee_contact_person_name}}</p>
        <p><strong>Email:</strong> {{consignee_contact_person_email}}</p>
      </div>
      <div class="section">
        <h3>Notify Party</h3>
        <p><strong>Name:</strong> {{notify_name}}</p>
        <p><strong>Address:</strong> {{notify_address}}</p>
        <p><strong>Contact:</strong> {{notify_contact_person_name}}</p>
        <p><strong>Email:</strong> {{notify_contact_person_email}}</p>
      </div>
      <div class="section">
        <h3>Vessel & Voyage Information</h3>
        <p><strong>Vessel:</strong> {{vessel_name}}</p>
        <p><strong>Shipping Line:</strong> {{shipping_line}}</p>
        <p><strong>Port of Loading:</strong> {{port_of_loading}}</p>
        <p><strong>Port of Discharge:</strong> {{port_of_discharge}}</p>
        <p><strong>Final Destination:</strong> {{final_destination}}</p>
      </div>
      <div class="section">
        <h3>Cargo Details</h3>
        <p><strong>Description:</strong> {{description_of_goods}}</p>
        <p><strong>Product:</strong> {{product_description}}</p>
        <p><strong>HS Code:</strong> {{hs_code}}</p>
        <p><strong>Total Packages:</strong> {{number_of_packages}}</p>
        <p><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</p>
        <p><strong>Total Net Weight:</strong> {{total_net_weight}} KGS</p>
      </div>
      <div class="section">
        <h3>Container Details</h3>
        <table>
          <thead>
            <tr>
              <th>Container No.</th>
              <th>Seal No.</th>
              <th>Net Weight (KGS)</th>
              <th>Gross Weight (KGS)</th>
            </tr>
          </thead>
          <tbody>
            {{#containers}}
            <tr>
              <td>{{container_number}}</td>
              <td>{{seal_number}}</td>
              <td>{{net_weight}}</td>
              <td>{{gross_weight}}</td>
            </tr>
            {{/containers}}
          </tbody>
        </table>
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
WHERE name = 'BLI Template';

-- 6. Sales Order
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sales Order</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 48%; font-size: 12px; line-height: 1.6; }
    .party h2 { font-size: 16px; margin-bottom: 15px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 2px; }
    .section { margin: 25px 0; }
    .section h3 { font-size: 14px; font-weight: 700; color: #255659; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .totals { margin-top: 20px; text-align: right; font-size: 12px; line-height: 1.8; }
    .totals strong { font-weight: 700; }
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
      <div class="title-row">
        <div class="main-title">Sales Order</div>
        <div class="title-meta">
          <div><span class="label">Order Number:</span> {{order_id}}</div>
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h2>Seller</h2>
          <p>{{metycle_name}}</p>
          <p>{{metycle_address}}</p>
          <p>{{metycle_city}}, {{metycle_country}}</p>
          <p>VAT: {{metycle_vat_id}}</p>
        </div>
        <div class="party">
          <h2>Buyer</h2>
          <p>{{purchaser_name}}</p>
          <p>{{purchaser_address}}</p>
          <p>{{purchaser_city}}, {{purchaser_country}}</p>
          <p>VAT: {{purchaser_vat}}</p>
        </div>
      </div>
      <div class="section">
        <h3>Product Details</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Grade</th>
              <th>Form</th>
              <th>Quantity (MT)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{commodity_type}}</td>
              <td>{{isri_grade}}</td>
              <td>{{metal_form}}</td>
              <td>{{allocated_quantity_mt}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <h3>Pricing</h3>
        <div class="totals">
          <div><strong>Price per MT:</strong> {{sell_price}}</div>
          <div><strong>Total Quantity:</strong> {{allocated_quantity_mt}} MT</div>
          <div style="font-size: 14px; margin-top: 10px;"><strong>Total Value:</strong> {{total_sell_value}}</div>
        </div>
      </div>
      <div class="section">
        <h3>Shipping Terms</h3>
        <p><strong>Ship From:</strong> {{ship_from}}</p>
        <p><strong>Ship To:</strong> {{ship_to}}</p>
        <p><strong>Incoterms:</strong> {{incoterms}}</p>
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
WHERE name = 'Sales Order';

-- 7. Purchase Order
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Purchase Order</title>
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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 48%; font-size: 12px; line-height: 1.6; }
    .party h2 { font-size: 16px; margin-bottom: 15px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 2px; }
    .section { margin: 25px 0; }
    .section h3 { font-size: 14px; font-weight: 700; color: #255659; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .totals { margin-top: 20px; text-align: right; font-size: 12px; line-height: 1.8; }
    .totals strong { font-weight: 700; }
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
      <div class="title-row">
        <div class="main-title">Purchase Order</div>
        <div class="title-meta">
          <div><span class="label">Order Number:</span> {{order_id}}</div>
          <div><span class="label">Date:</span> {{current_date}}</div>
        </div>
      </div>
      <div class="parties">
        <div class="party">
          <h2>Buyer</h2>
          <p>{{metycle_name}}</p>
          <p>{{metycle_address}}</p>
          <p>{{metycle_city}}, {{metycle_country}}</p>
          <p>VAT: {{metycle_vat_id}}</p>
        </div>
        <div class="party">
          <h2>Seller</h2>
          <p>{{purchaser_name}}</p>
          <p>{{purchaser_address}}</p>
          <p>{{purchaser_city}}, {{purchaser_country}}</p>
          <p>VAT: {{purchaser_vat}}</p>
        </div>
      </div>
      <div class="section">
        <h3>Product Details</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Grade</th>
              <th>Form</th>
              <th>Quantity (MT)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{commodity_type}}</td>
              <td>{{isri_grade}}</td>
              <td>{{metal_form}}</td>
              <td>{{allocated_quantity_mt}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="section">
        <h3>Pricing</h3>
        <div class="totals">
          <div><strong>Price per MT:</strong> {{buy_price}}</div>
          <div><strong>Total Quantity:</strong> {{allocated_quantity_mt}} MT</div>
          <div style="font-size: 14px; margin-top: 10px;"><strong>Total Value:</strong> {{total_buy_value}}</div>
        </div>
      </div>
      <div class="section">
        <h3>Shipping Terms</h3>
        <p><strong>Ship From:</strong> {{ship_from}}</p>
        <p><strong>Ship To:</strong> {{ship_to}}</p>
        <p><strong>Incoterms:</strong> {{incoterms}}</p>
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
WHERE name = 'Purchase Order';
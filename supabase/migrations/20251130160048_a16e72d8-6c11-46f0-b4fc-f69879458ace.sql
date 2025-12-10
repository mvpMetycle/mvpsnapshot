-- Update Packing List with proper section headings

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
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .main-title { font-size: 30px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 12px; line-height: 1.6; }
    .title-meta span.label { font-weight: 600; }
    .section { margin-bottom: 25px; }
    .section-header { font-size: 14px; font-weight: 700; color: #255659; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #245356; }
    .section-content { font-size: 12px; line-height: 1.6; padding-left: 10px; }
    .section-content p { margin-bottom: 3px; }
    .details-grid { display: flex; gap: 30px; margin-bottom: 25px; }
    .detail-item { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #255659; color: white; padding: 10px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .totals { margin-top: 20px; padding: 15px; background: #f8f8f8; border-left: 4px solid #245356; }
    .totals div { margin-bottom: 6px; line-height: 1.6; }
    .totals strong { font-weight: 700; color: #255659; }
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

      <div class="section">
        <div class="section-header">Applicant</div>
        <div class="section-content">
          <p>{{shipper}}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Consignee</div>
        <div class="section-content">
          <p>{{consignee_name}}</p>
          <p>{{consignee_address}}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Details</div>
        <div class="details-grid">
          <div class="detail-item">
            <p><strong>Vessel:</strong> {{vessel_name}}</p>
            <p><strong>Port of Loading:</strong> {{port_of_loading}}</p>
            <p><strong>Port of Discharge:</strong> {{port_of_discharge}}</p>
          </div>
          <div class="detail-item">
            <p><strong>Description of Goods:</strong> {{description_of_goods}}</p>
            <p><strong>Country of Origin:</strong> {{country_of_origin}}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Container Details</div>
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

      <div class="totals">
        <div><strong>Total Net Weight:</strong> {{total_net_weight}} KGS</div>
        <div><strong>Total Gross Weight:</strong> {{total_gross_weight}} KGS</div>
        <div><strong>Total Containers:</strong> {{number_of_containers}}</div>
        <div><strong>Total Packages:</strong> {{number_of_packages}}</div>
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
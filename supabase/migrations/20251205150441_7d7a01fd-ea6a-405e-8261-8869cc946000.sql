-- Insert Freight Insurance Certificate template
INSERT INTO document_templates (name, description, category, content, is_active)
VALUES (
  'Freight Insurance Certificate',
  'Insurance certificate confirming cargo insurance coverage for shipments',
  'Certificate',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; }
    .page { width: 100%; min-height: 297mm; padding: 20mm; position: relative; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #255659; padding-bottom: 15px; }
    .logo-section { display: flex; align-items: center; gap: 15px; }
    .logo { width: 50px; height: 50px; }
    .company-header { font-size: 10pt; color: #666; }
    .document-title { text-align: center; margin: 25px 0; }
    .document-title h1 { font-size: 22pt; color: #255659; font-weight: bold; letter-spacing: 1px; }
    .info-row { display: flex; justify-content: flex-end; gap: 30px; margin-bottom: 20px; font-size: 10pt; }
    .info-item { text-align: right; }
    .info-label { font-weight: bold; color: #255659; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12pt; font-weight: bold; color: #255659; border-bottom: 1px solid #70F3DC; padding-bottom: 5px; margin-bottom: 10px; }
    .two-column { display: flex; gap: 40px; }
    .column { flex: 1; }
    .field { margin-bottom: 8px; }
    .field-label { font-weight: bold; font-size: 9pt; color: #666; }
    .field-value { font-size: 10pt; }
    .body-text { margin: 25px 0; font-size: 11pt; line-height: 1.6; text-align: justify; }
    .shipment-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .shipment-details .section-title { border-bottom: 1px solid #255659; }
    .goods-description { font-size: 11pt; font-weight: bold; margin-top: 10px; }
    .closing { margin-top: 30px; }
    .signature-section { margin-top: 40px; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 50px; padding-top: 5px; font-size: 10pt; }
    .footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; border-top: 1px solid #ddd; padding-top: 10px; font-size: 8pt; color: #666; }
    .footer-grid { display: flex; justify-content: space-between; }
    .footer-col { flex: 1; }
    .footer-col:not(:last-child) { border-right: 1px solid #ddd; padding-right: 10px; margin-right: 10px; }
    .highlight { color: #255659; font-weight: bold; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-section">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHJ4PSI4IiBmaWxsPSIjMjU1NjU5Ii8+PHRleHQgeD0iMjUiIHk9IjMyIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjNzBGM0RDIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NPC90ZXh0Pjwvc3ZnPg==" class="logo" alt="Metycle Logo">
        <div class="company-header">
          <strong>{{metycle_name}}</strong><br>
          {{metycle_address}}<br>
          {{metycle_city}} {{metycle_country}}
        </div>
      </div>
    </div>

    <div class="document-title">
      <h1>Insurance Certificate</h1>
    </div>

    <div class="info-row">
      <div class="info-item">
        <span class="info-label">Order Number:</span> {{order_id}}
      </div>
      <div class="info-item">
        <span class="info-label">Document Date:</span> {{current_date}}
      </div>
    </div>

    <div class="two-column">
      <div class="column">
        <div class="section">
          <div class="section-title">Shipper</div>
          <div class="field-value">
            <strong>{{metycle_name}}</strong><br>
            {{metycle_address}}<br>
            {{metycle_city}} - {{metycle_country}}<br>
            Contact: {{metycle_email}}<br>
            Phone: {{metycle_phone}}
          </div>
        </div>
      </div>
      <div class="column">
        <div class="section">
          <div class="section-title">Purchaser</div>
          <div class="field-value">
            <strong>{{purchaser_name}}</strong><br>
            {{purchaser_address}}<br>
            {{purchaser_city}}, {{purchaser_country}}
          </div>
        </div>
      </div>
    </div>

    <div class="body-text">
      Dear Sir or Madam,<br><br>
      {{metycle_name}} has insured the below shipment for <span class="highlight">110% of the Cargo Value</span> under the <span class="highlight">GOTHAER Insurance Policy No: 08.893.989982</span> for Metycle Shipments.
    </div>

    <div class="shipment-details">
      <div class="section-title">SHIPMENT DETAILS</div>
      <div class="two-column" style="margin-top: 10px;">
        <div class="column">
          <div class="field">
            <span class="field-label">Bill of Lading Number:</span><br>
            <span class="field-value">{{bl_number}}</span>
          </div>
        </div>
        <div class="column">
          <div class="field">
            <span class="field-label">Loading Date:</span><br>
            <span class="field-value">{{loading_date}}</span>
          </div>
        </div>
      </div>
      <div class="goods-description">
        {{description_of_goods}}, GW: {{total_gross_weight}} KGS, NW: {{total_net_weight}} KGS
      </div>
    </div>

    <div class="closing">
      <p>Thank you for this business.</p>
      <p>We hope to do more business with your company in the near future.</p>
      <br>
      <p>Best regards,</p>
      <div class="signature-section">
        <div class="signature-line">
          {{metycle_name}}
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-grid">
        <div class="footer-col">
          <strong>{{metycle_name}}</strong><br>
          {{metycle_address}} | {{metycle_city}}, {{metycle_country}}<br>
          Managing Directors: {{metycle_managing_directors}}<br>
          Company Register: {{metycle_register}}
        </div>
        <div class="footer-col">
          Phone: {{metycle_phone}}<br>
          E-Mail: {{metycle_email}}<br>
          VAT-ID: {{metycle_vat_id}}
        </div>
        <div class="footer-col">
          Bank: {{metycle_bank_1}}<br>
          IBAN: {{metycle_iban_1}}<br><br>
          Bank: {{metycle_bank_2}}<br>
          IBAN: {{metycle_iban_2}}<br>
          BIC: {{metycle_bic_2}}
        </div>
      </div>
    </div>
  </div>
</body>
</html>',
  true
);
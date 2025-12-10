-- Update Purchase Order template with comprehensive information from PDF
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Purchase Order Confirmation</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #e5e5e5; padding: 20px; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto 20px; background: #ffffff; display: flex; flex-direction: column; border: 1px solid #ccc; page-break-after: always; }
    .top-bar { background: #245356; color: #ffffff; padding: 18px 35px; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-transform: lowercase; }
    .logo-text { font-size: 26px; font-weight: 700; text-transform: lowercase; letter-spacing: 1px; }
    .top-address { text-align: right; font-size: 11px; line-height: 1.4; white-space: pre-line; }
    .content { flex: 1; padding: 40px 45px 60px; font-size: 12px; color: #000000; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .main-title { font-size: 28px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 11px; line-height: 1.6; }
    .title-meta div { margin-bottom: 2px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 30px; }
    .party { width: 48%; font-size: 11px; line-height: 1.5; }
    .party h2 { font-size: 14px; margin-bottom: 10px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 1px; }
    .section { margin: 20px 0; }
    .section h3 { font-size: 13px; font-weight: 700; color: #255659; margin-bottom: 8px; }
    .section p { font-size: 11px; line-height: 1.5; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #255659; color: white; padding: 8px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    .totals { margin-top: 15px; text-align: right; font-size: 12px; font-weight: 700; }
    .signature-section { margin-top: 30px; }
    .signature-section h3 { font-size: 13px; margin-bottom: 15px; }
    .signature-boxes { display: flex; justify-content: space-between; gap: 20px; }
    .sig-box { width: 48%; border: 1px solid #ddd; padding: 15px; min-height: 80px; }
    .sig-box p { font-size: 10px; margin-bottom: 5px; }
    .bottom-bar { background: #393939; color: #ffffff; padding: 18px 35px 20px; font-size: 9px; }
    .footer-columns { display: flex; justify-content: space-between; gap: 20px; }
    .footer-col { width: 33%; line-height: 1.5; white-space: pre-line; }
    .tc-page { padding: 35px 45px; }
    .tc-page h1 { font-size: 20px; font-weight: 700; color: #255659; margin-bottom: 20px; text-align: center; }
    .tc-page h2 { font-size: 13px; font-weight: 700; color: #255659; margin: 18px 0 10px 0; }
    .tc-page p, .tc-page li { font-size: 10px; line-height: 1.6; margin-bottom: 8px; text-align: justify; }
    .tc-page ul { margin-left: 20px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <!-- Page 1: Order Details -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <main class="content">
      <div class="title-row">
        <div class="main-title">Purchase Order Confirmation</div>
        <div class="title-meta">
          <div><strong>Document date:</strong> {{current_date}}</div>
          <div><strong>Order ID:</strong> {{order_id}}</div>
        </div>
      </div>
      
      <div class="parties">
        <div class="party">
          <h2>Buyer</h2>
          <p><strong>METYCLE GmbH</strong></p>
          <p>Venloer Str. 301-303</p>
          <p>50823 Cologne - Germany</p>
          <p>Commercial Register: Cologne, HRB 110770</p>
          <p>EORI Number: DE853113866728686</p>
          <p>VAT Number: DE354945597</p>
          <p>Contact: operations@metycle.com</p>
        </div>
        <div class="party">
          <h2>Supplier</h2>
          <p><strong>{{seller_name}}</strong></p>
          <p>{{seller_address}}</p>
          <p>{{seller_city}}, {{seller_country}}</p>
          <p>Contact person: {{seller_contact_name}}</p>
          <p>E-mail: {{seller_contact_email}}</p>
        </div>
      </div>

      <div class="section">
        <h3>Order Details</h3>
        <p><strong>Transport method:</strong> {{transport_method}}</p>
        <p><strong>Country of material origin:</strong> {{country_of_origin}}</p>
        <p><strong>Delivery location:</strong> {{ship_to}}</p>
        <p><strong>Quotational period:</strong> {{qp_start}} to {{qp_end}}</p>
        <p><strong>Delivery terms:</strong> {{incoterms}}</p>
        <p><strong>Payment terms:</strong> {{payment_terms}}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Format</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{commodity_type}} {{isri_grade}}</td>
            <td>{{allocated_quantity_mt}} MT</td>
            <td>{{metal_form}}</td>
            <td>{{currency}} {{buy_price}}/MT</td>
            <td>{{currency}} {{total_buy_value}}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        Total (excl. VAT): {{currency}} {{total_buy_value}}
      </div>

      <p style="margin-top: 20px; font-size: 11px;">This order will be executed on METYCLE GmbH''s Terms and Conditions (see attached) or as specified in detail above.</p>
      <p style="font-size: 11px; margin-top: 8px;">Please return a countersigned copy of the order, along with loading schedule to operations@metycle.com.</p>

      <div class="signature-section">
        <h3>Signatures</h3>
        <div class="signature-boxes">
          <div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 40px;">Date, place, signature: {{current_date}}</p>
          </div>
          <div class="sig-box">
            <p><strong>{{seller_name}} / {{seller_contact_name}}</strong></p>
            <p style="margin-top: 40px;">Date, place, signature:</p>
          </div>
        </div>
      </div>
    </main>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: trading@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 2: Terms and Conditions Part 1 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h1>General Terms and Conditions of Purchase</h1>
      
      <h2>1. Scope</h2>
      <p>1.1. These are the General Terms and Conditions of Purchase ("GTC Purchase") of METYCLE GmbH, a German limited liability company registered with the Commercial Register of the Local Court of Cologne under HRB 110770, with its business address at Venloer Str. 301-303, 50823 Cologne, Germany ("METYCLE").</p>
      <p>1.2. These GTC Purchase govern the purchase of scrap metal ("Product") by METYCLE from a supplier ("Seller"; Seller and METYCLE the "Parties", each a "Party").</p>
      <p>1.3. METYCLE provides its offer only to Sellers that are entrepreneurs within the meaning of Section 14 of the German Civil Code (BGB).</p>
      <p>1.4. These GTC Purchase apply exclusively unless the Parties have agreed on different regulations in a specific contract. Deviating, opposing or supplementary general terms and conditions of Seller shall only become integral components of the contract if and to the extent METYCLE explicitly agrees to their validity in text form (e.g., e-mail). This requirement of approval shall also apply if METYCLE accepts delivery of the Product without reservation despite being aware of deviating, opposing or supplementary general terms and conditions of the Seller.</p>

      <h2>2. Object of the Contract</h2>
      <p>2.1. METYCLE purchases the Product from Seller. Seller delivers the Product to an agreed place of delivery in accordance with Section 5.</p>
      <p>2.2. To purchase the Product, METYCLE places a purchase order with Seller in text form (e.g., e-mail). Unless agreed otherwise, each purchase order shall contain information on the type (e.g., aluminum scrap, red metals like copper or brass, mixed metals), quality and quantity of the Product ordered, the preferred date and exact place of delivery as well as the recipient of the delivery.</p>

      <h2>3. Conclusion of the Contract</h2>
      <p>3.1. The purchase contract will be concluded when the Seller accepts METYCLE''s purchase order in text form (e.g., e-mail) within a reasonable period of time, not exceeding one week, or by shipping the Product as ordered without reservation so that the Product arrives not later than one week after the placement of the purchase order at the agreed place of delivery.</p>

      <h2>4. Prices and Terms of Payment</h2>
      <p>4.1. The Parties agree upon the price for the Product in each purchase order.</p>
      <p>4.2. Unless otherwise agreed, the currency is US-Dollar, and the price must be paid in US-Dollar.</p>
      <p>4.3. As to ancillary costs, Section A.9 and B.9 of FCA Incoterms 2020 apply.</p>
      <p>4.4. All prices are exclusive of statutory value added tax ("VAT"). The respective VAT shall be added where applicable.</p>
      <p>4.5. Payment shall be due within 30 (thirty) days after delivery of the Product and receipt of an accurate invoice.</p>
      <p>4.6. Payments shall be made by wire transfer to Seller''s bank account.</p>

      <h2>5. Delivery and Shipping Terms</h2>
      <p>5.1. The delivery shall be effected according to FCA Incoterms 2020.</p>
      <p>5.2. METYCLE shall specify the place of delivery by city, street and further details (such as floor or suite) in the purchase order as exact as possible as follows: "FCA (place of delivery) Incoterms 2020". If a place of delivery is not specified in the respective purchase order, Seller shall deliver the Product to METYCLE''s business address. The respective place of delivery shall also be the place of performance for the delivery and any supplementary performance.</p>
      <p>5.3. All delivery dates stated in METYCLE''s purchase order or otherwise agreed upon are binding.</p>
      <p>5.4. Seller shall inform METYCLE without undue delay of any impending or actual delay in delivery, the reasons for such delay and the anticipated duration of such delay. Seller''s obligation to meet the agreed delivery date shall remain unaffected by this notification obligation. Seller shall take all necessary measures at its own expense to meet the agreed delivery date. Statutory rights of METYCLE due to a default of the Seller, such as the compensation of demurrage fees or other damages, remain unaffected.</p>
      <p>5.5. METYCLE may involve third parties in the shipping process, e.g., companies of the Danish Maersk group via the internet platform https://www.twill.net/de/, in the shipping process. Arising costs shall be allocated to the Parties according to FCA Incoterms 2020.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: trading@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 3: Terms and Conditions Part 2 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </header>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h2>6. Export/Import Clearance and Product Compliance</h2>
      <p>6.1. As to export/import clearance, FCA Incoterms 2020 apply.</p>
      <p>6.2. As far as the Product is covered by the so-called "Green List" according to Annex III of Regulation (EC) No. 1013/2006, the Seller provides to METYCLE the completed transport document according to Annex VII of Regulation (EC) No. 1013/2006.</p>
      <p>6.3. As far as an import approval is necessary, Seller supports METYCLE by getting such approval according to FCA Incoterms 2020 (A.7.b).</p>
      <p>6.4. If and to the extent that Regulation (EC) No. 1418/2007, amended by Regulation (EC) No. 2021/1840, and amended from time to time, is applicable for forwarding (exporting) the Product in a Non-OECD member state of METYCLE''s choice, Seller shall assist METYCLE on demand in complying with the requirements set up therein, in particular by providing any information and documentation required without delay.</p>

      <h2>7. Inspection, Defects'' Notification</h2>
      <p>7.1. The obligation to inspect and give notice of defects according to Section 377 of the German Commercial Code (HGB) applies with the proviso that the obligation of METYCLE to inspect is limited to defects that are openly apparent (e.g., obvious transport damage, discrepancies in type or quantity of the ordered product). The obligation to give notice of defects discovered later remains unaffected. Irrespective of the obligation to inspect, the complaint (notification of defects) about an obvious defect shall in any case be deemed to have been made without undue delay and on time if it is sent within 3 (three) days of receipt or discovery.</p>

      <h2>8. Liability for Defects, Warranties</h2>
      <p>8.1. METYCLE''s rights in case of material and/or legal defects of the Product shall be governed by the statutory provisions.</p>
      <p>8.2. Seller warrants that the Product:</p>
      <ul>
        <li>8.2.1. complies with all applicable laws, in particular with EU and German waste transport law, as well as all regulations and requirements of regulatory bodies,</li>
        <li>8.2.2. complies with all specifications of the purchase order and all other contractual agreements between the Parties,</li>
        <li>8.2.3. is free from rights of third parties, and that the use of the Product does not violate any rights of third parties.</li>
      </ul>

      <h2>9. Liability in General</h2>
      <p>9.1. METYCLE assumes unlimited liability for willful intent and gross negligence on the part of METYCLE, its agents and legal representatives; METYCLE only accepts liability for simple negligence in the event of breaches concerning Cardinal Contractual Duties. "Cardinal Contractual Duties" are obligations which are indispensable for the fulfilment of the contract, and for which the Seller regularly relies and is entitled to rely on compliance.</p>
      <p>9.2. Liability for breaches of Cardinal Contractual Duties is restricted to the damages which are typical for this type of contract and which METYCLE should have been able to anticipate when establishing the contract based on the circumstances known at that time.</p>
      <p>9.3. The present limitations of liability do not apply if explicit guarantees have been made, for claims due to a lack of warranted qualities or for damages due to injury of life, body or health. Liability according to the product liability law also remains unaffected.</p>
      <p>9.4. The liability arrangement in this Section 9 is conclusive. It applies with respect to all damage compensation claims, irrespective of their legal ground, particularly also with respect to pre-contractual claims or collateral contractual claims. This liability arrangement also applies in favor of legal representatives and agents of METYCLE if claims are asserted directly against them.</p>

      <h2>10. Retention of Title</h2>
      <p>10.1. Only if and only to the extent that METYCLE has explicitly agreed in text form (e.g., e-mail) to a provision of the Seller stipulating a retention of title, the Seller may invoke such retention of title.</p>

      <h2>11. Data Protection</h2>
      <p>11.1. METYCLE treats the Seller''s personal data in accordance with data protection laws. The applicable data protection regulations can be found in the privacy policy on METYCLE''s website.</p>
      <p>11.2. Seller is obliged to comply with applicable data protection laws.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: trading@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 4: Terms and Conditions Part 3 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h2>12. Confidentiality</h2>
      <p>12.1. "Confidential Information" means all trade secrets, the existence and content of the business relationship between the Parties as well as all other information that is non-public, by its nature to be deemed confidential, designated as confidential, and/or protected.</p>
      <p>12.2. Each Party is obliged:</p>
      <ul>
        <li>12.2.1. to treat the other Party''s Confidential Information as strictly confidential, and only to use such information for the purpose of fulfilling the contractual obligations resulting from these GTC Purchase;</li>
        <li>12.2.2. to refrain from passing on or disclosing the other Party''s Confidential Information to third parties and to refrain from providing access to Confidential Information for third parties;</li>
        <li>12.2.3. to adopt appropriate measures to prevent unauthorized persons from obtaining access to the other Party''s Confidential Information.</li>
      </ul>
      <p>12.3. The obligations listed in Section 12.2 do not apply to Confidential Information:</p>
      <ul>
        <li>12.3.1. that was general knowledge or generally accessible to the public before it was disclosed to the other Party, or that becomes public without violating any confidentiality obligations;</li>
        <li>12.3.2. that was already known to the receiving Party before it was disclosed and it can be demonstrated that no confidentiality obligations were violated;</li>
        <li>12.3.3. that was developed independently by the receiving party without the use or reference of the disclosing Party''s Confidential Information;</li>
        <li>12.3.4. that is handed over or made accessible to the receiving Party by an authorized third party without violating any confidentiality obligations;</li>
        <li>12.3.5. that must be disclosed due to mandatory statutory provisions or a court decision and/or a decision of an authority.</li>
      </ul>
      <p>12.4. The Parties shall ensure through suitable contractual arrangements that the employees and contractors working for them shall also, for the time period specified in Section 12.5 of these GTC Purchase, refrain from individual use or disclosure of Confidential Information. The Parties shall only disclose to employees or contractors Confidential Information to the extent such employees or contractors need to know the information for the fulfilment of the contract.</p>
      <p>12.5. The obligations under this Section 12 of these GTC Purchase continue to apply for a period of 3 (three) years after the termination of the contractual relationship between the Parties. Statutory provisions concerning the protection of trade secrets remain unaffected.</p>

      <h2>13. Final Provisions</h2>
      <p>13.1. Seller only has a right to set-off, reduction and/or retention against METYCLE if its counterclaim has been legally established, is undisputed or acknowledged by METYCLE. Furthermore, Seller may only exercise a right of retention if the counterclaim is based on the same contractual relationship. Seller''s right to reclaim remuneration not actually owed shall remain unaffected by the limitation of this Section.</p>
      <p>13.2. All declarations concerning and amendments to the contract including this form requirement must be submitted in text form (e.g., e-mail). This also applies to amendments of this clause.</p>
      <p>13.3. These GTC Purchase shall be governed by the laws of the Federal Republic of Germany (excluding the United Nations Convention on Contracts for the International Sale of Goods).</p>
      <p>13.4. Cologne shall be the exclusive place of jurisdiction for all disputes arising out of or in connection with these GTC Purchase. However, METYCLE is entitled to bring legal action at the registered seat of the Seller. If the registered seat of the Seller is outside the European Economic Area, all disputes arising out of or in connection with the contractual relationship shall be finally settled in accordance with the Arbitration Rules of the German Arbitration Institute (DIS) without recourse to the ordinary courts of law. The arbitral tribunal shall be comprised of a sole arbitrator. The seat of arbitration is Cologne, Germany, and the language of the arbitration shall be English.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: trading@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>
</body>
</html>',
  updated_at = NOW()
WHERE name = 'Purchase Order';

-- Update Sales Order template with comprehensive information from PDF
UPDATE document_templates
SET content = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sales Order</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #e5e5e5; padding: 20px; }
    .page { width: 794px; min-height: 1123px; margin: 0 auto 20px; background: #ffffff; display: flex; flex-direction: column; border: 1px solid #ccc; page-break-after: always; }
    .top-bar { background: #245356; color: #ffffff; padding: 18px 35px; display: flex; justify-content: space-between; align-items: center; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; text-transform: lowercase; }
    .logo-text { font-size: 26px; font-weight: 700; text-transform: lowercase; letter-spacing: 1px; }
    .top-address { text-align: right; font-size: 11px; line-height: 1.4; white-space: pre-line; }
    .content { flex: 1; padding: 40px 45px 60px; font-size: 12px; color: #000000; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .main-title { font-size: 28px; font-weight: 700; color: #255659; }
    .title-meta { text-align: right; font-size: 11px; line-height: 1.6; }
    .title-meta div { margin-bottom: 2px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 30px; }
    .party { width: 48%; font-size: 11px; line-height: 1.5; }
    .party h2 { font-size: 14px; margin-bottom: 10px; font-weight: 700; color: #255659; }
    .party p { margin-bottom: 1px; }
    .section { margin: 20px 0; }
    .section h3 { font-size: 13px; font-weight: 700; color: #255659; margin-bottom: 8px; }
    .section p { font-size: 11px; line-height: 1.5; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #255659; color: white; padding: 8px; text-align: left; font-size: 11px; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    .totals { margin-top: 15px; text-align: right; font-size: 12px; font-weight: 700; }
    .signature-section { margin-top: 30px; }
    .signature-section h3 { font-size: 13px; margin-bottom: 15px; }
    .signature-boxes { display: flex; justify-content: space-between; gap: 20px; }
    .sig-box { width: 48%; border: 1px solid #ddd; padding: 15px; min-height: 80px; }
    .sig-box p { font-size: 10px; margin-bottom: 5px; }
    .bottom-bar { background: #393939; color: #ffffff; padding: 18px 35px 20px; font-size: 9px; }
    .footer-columns { display: flex; justify-content: space-between; gap: 20px; }
    .footer-col { width: 33%; line-height: 1.5; white-space: pre-line; }
    .tc-page { padding: 35px 45px; }
    .tc-page h1 { font-size: 20px; font-weight: 700; color: #255659; margin-bottom: 20px; text-align: center; }
    .tc-page h2 { font-size: 13px; font-weight: 700; color: #255659; margin: 18px 0 10px 0; }
    .tc-page p, .tc-page li { font-size: 10px; line-height: 1.6; margin-bottom: 8px; text-align: justify; }
    .tc-page ul { margin-left: 20px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <!-- Page 1: Order Details -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <main class="content">
      <div class="title-row">
        <div class="main-title">Sales Order</div>
        <div class="title-meta">
          <div><strong>Order number:</strong> {{order_id}}</div>
          <div><strong>Document date:</strong> {{current_date}}</div>
        </div>
      </div>
      
      <div class="parties">
        <div class="party">
          <h2>Seller</h2>
          <p><strong>METYCLE GmbH</strong></p>
          <p>Venloer Str. 301-303</p>
          <p>50823 Cologne - Germany</p>
          <p>Commercial Register: Cologne, HRB 110770</p>
          <p>EORI Number: DE853113866728686</p>
          <p>VAT Number: DE354945597</p>
          <p>Contact: contracts@metycle.com</p>
        </div>
        <div class="party">
          <h2>Purchaser</h2>
          <p><strong>{{purchaser_name}}</strong></p>
          <p>{{purchaser_address}}</p>
          <p>{{purchaser_city}}, {{purchaser_country}}</p>
          <p>Contact person: {{purchaser_contact_name}}</p>
          <p>E-mail: {{purchaser_contact_email}}</p>
        </div>
      </div>

      <div class="section">
        <h3>Order details</h3>
        <p><strong>Transport method:</strong> {{transport_method}}</p>
        <p><strong>Delivery terms:</strong> {{incoterms}}</p>
        <p><strong>Delivery location:</strong> {{ship_to}}</p>
        <p><strong>Payment terms:</strong> {{payment_terms}}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Format</th>
            <th>Unit price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{commodity_type}} {{isri_grade}}</td>
            <td>{{allocated_quantity_mt}} MT</td>
            <td>{{metal_form}}</td>
            <td>{{currency}} {{sell_price}}/MT</td>
            <td>{{currency}} {{total_sell_value}}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        Total (excl. VAT): {{currency}} {{total_sell_value}}
      </div>

      <p style="margin-top: 20px; font-size: 11px;">This order will be executed on METYCLE GmbH''s Terms and Conditions (see attached) or as specified in detail above.</p>

      <div class="signature-section">
        <h3>Signatures</h3>
        <div class="signature-boxes">
          <div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 40px;">Date, place, signature:</p>
          </div>
          <div class="sig-box">
            <p><strong>{{purchaser_name}} / {{purchaser_contact_name}}</strong></p>
            <p style="margin-top: 40px;">Date, place, signature:</p>
          </div>
        </div>
      </div>
    </main>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: contracts@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 2: Terms and Conditions Part 1 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h1>General Terms and Conditions of Sale</h1>
      
      <h2>1. Scope</h2>
      <p>1.1. These are the General Terms and Conditions of Sale ("GTC Sale") of METYCLE GmbH, a German limited liability company registered with the Commercial Register of the Local Court of Cologne under HRB 110770, with its business address at Venloer Str. 301-303, 50823 Cologne, Germany ("METYCLE").</p>
      <p>1.2. These GTC Sale govern the sale of scrap metal ("Product") by METYCLE as seller to a purchaser ("Purchaser"; Purchaser and METYCLE the "Parties", each a "Party").</p>
      <p>1.3. METYCLE provides its offer only to Purchasers that are entrepreneurs within the meaning of section 14 of the German Civil Code (BGB).</p>
      <p>1.4. These GTC Sale apply exclusively unless the Parties have agreed on different regulations in a specific contract. Deviating, opposing or supplementary general terms and conditions of the Purchaser shall only become integral components of the contract if and to the extent METYCLE explicitly agrees to their validity in text form (e.g., e-mail). This requirement of approval shall also apply if METYCLE delivers the Product without reservation despite being aware of deviating, opposing or supplementary general terms and conditions of the Purchaser.</p>

      <h2>2. Object of the Contract</h2>
      <p>2.1. METYCLE sells the Product to the Purchaser. METYCLE delivers the Product to a port of delivery of its choosing, notifies the Purchaser of the delivery and concludes a contract of carriage with third parties carrying out the shipping process to an agreed port of destination in accordance with section 5.</p>
      <p>2.2. To purchase the Product, the Purchaser places a purchase order with METYCLE in text form (e.g., e-mail). Unless agreed otherwise, each purchase order shall contain information on the type (e.g., aluminum scrap, red metals like copper or brass, mixed metals), quality and quantity of the Product ordered, the preferred date and exact place within the port of destination as well as the recipient of the Product.</p>

      <h2>3. Conclusion of the Contract</h2>
      <p>3.1. The purchase contract will be concluded when METYCLE accepts the purchase order in text form (e.g., e-mail) within a reasonable period of time, not exceeding two weeks, or by shipping the Product as ordered without reservation so that the Product arrives not later than two weeks after the placement of the purchase order at the agreed place of delivery.</p>

      <h2>4. Prices and Terms of Payment</h2>
      <p>4.1. The Parties agree upon the price for the Product in each purchase order.</p>
      <p>4.2. Unless otherwise agreed, the currency is US-Dollar, and the price must be paid in US-Dollar.</p>
      <p>4.3. As to costs, section A.9 and B.9 of CIF Incoterms 2020 apply.</p>
      <p>4.4. All prices are exclusive of statutory value added tax ("VAT"). The respective VAT shall be added where applicable.</p>
      <p>4.5. Payment shall be due within ten days after delivery of the Product and receipt of an accurate invoice. Notwithstanding the foregoing, METYCLE shall be entitled in individual cases to deliver the Product (in whole or in part) only against advance payment. METYCLE notifies the Purchaser of such precondition at the latest when confirming the purchase order.</p>
      <p>4.6. Payments shall be made by wire transfer to METYCLE''s bank account.</p>

      <h2>5. Delivery and Shipping Terms, Insurance</h2>
      <p>5.1. Delivery, notification of delivery and shipment shall be effected according to CIF Incoterms 2020, unless otherwise stipulated below.</p>
      <p>5.2. The transfer of risks takes place in accordance with the provisions of CIF Incoterms 2020.</p>
      <p>5.3. The Purchaser shall specify the port of destination in the purchase order as exact as possible and add the following: "CIF {port of destination} Incoterms 2020".</p>
      <p>5.4. METYCLE shall inform the Purchaser about the presumed delivery date when accepting the purchase order. As far as METYCLE is not able to meet the announced delivery date by reasons for which METYCLE is not responsible, METYCLE shall inform the Purchaser thereof as early as possible as well as of the reasons for such delay and the anticipated duration of such delay. If the Product remains unavailable within the new delivery period, METYCLE shall be entitled to withdraw from the contract in whole or in part; METYCLE shall immediately reimburse any consideration already paid by the Purchaser, without interest. Unavailability of the Product shall be deemed to exist, e.g., in the event of late delivery by METYCLE''s suppliers, if METYCLE has concluded a congruent hedging transaction, in the event of other disruptions in the supply chain, e.g., due to force majeure, or if METYCLE is not obliged to procure in an individual case.</p>
      <p>5.5. The occurrence of METYCLE''s delay in delivery shall be determined in accordance with the statutory provisions. In any case, however, a reminder (Mahnung) by the Purchaser is required.</p>
      <p>5.6. The Purchaser''s rights under these GTC Sale and METYCLE''s statutory rights, in particular in the event of an exclusion of the duty of performance (e.g., due to impossibility or unreasonableness of performance and/or subsequent performance), shall remain unaffected.</p>
      <p>5.7. METYCLE concludes contracts of carriage with third parties carrying out the shipping process, e.g., companies of the Danish Maersk group via the internet platform https://www.twill.net/de/, in accordance with CIF Incoterms 2020. Arising costs shall be allocated to the Parties according to CIF Incoterms 2020.</p>
      <p>5.8. METYCLE obtains and pays for insurance coverage according to CIF Incoterms 2020.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: contracts@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 3: Terms and Conditions Part 2 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h2>6. Export/Import Clearance</h2>
      <p>6.1. As to export/import clearance, CIF Incoterms 2020 apply. On request of the Purchaser, METYCLE may support the Purchaser with getting an import clearance by involving third parties according to section 5.7.</p>
      <p>6.2. As far as the Product is covered by the so-called "Green List" according to Annex III of Regulation (EC) No. 1013/2006, METYCLE provides the Purchaser the information which METYCLE had received from its seller in order to enable the Purchaser to produce the completed transport document according to Annex VII of Regulation (EC) No. 1013/2006.</p>
      <p>6.3. METYCLE supports the Purchaser regarding import and/or transit formalities and duties according to CIF Incoterms 2020, if and as far as applicable. METYCLE provides the Purchaser with necessary documentation as set out in CIF Incoterms 2020.</p>
      <p>6.4. If and to the extent that Regulation (EC) No. 1418/2007, amended by Regulation (EC) No. 2021/1840, and amended from time to time, is applicable when importing the Product to a non-OECD member country of Purchaser''s choice, METYCLE shall assist the Purchaser on demand in complying with the requirements set up therein, in particular by providing any information and documentation required without delay.</p>

      <h2>7. Inspection, Notification of Defects</h2>
      <p>7.1. The Buyer and Seller agree to accept the mutually accepted weigh bridge slips to count towards total weight calculation of the material in question.</p>
      <p>7.2. Buyer and Seller agree that material is as per photos with no specific guarantee of recovery.</p>
      <p>7.3. In case of any claims, it must be raised within 2 days of cargo arrival and formal claim with evidence from mutually agreed 3rd party Independent Claims Settling Agent (such as Arthur H. Knight or SGS) only within 7 days of cargo arrival.</p>
      <p>7.4. Seller''s representative may be present at time of independent inspection if they choose to do so.</p>
      <p>7.5. Any claims received after that will not be entertained.</p>

      <h2>8. Liability for Defects</h2>
      <p>8.1. The statutory provisions shall apply to the Purchaser''s rights in the event of material defects and/or legal defects, unless otherwise stipulated below.</p>
      <p>8.2. The Purchaser is only entitled to assert claims for defects against METYCLE if it has complied with its obligation to inspect the Product and notify METYCLE of defects in accordance with section 7.</p>
      <p>8.3. If the Product is defective, METYCLE may choose whether to provide subsequent performance by remedying the defect (subsequent improvement) or by delivering a good free of defects (replacement delivery). If the type of subsequent performance chosen by METYCLE is unreasonable for the Purchaser in the individual case, the Purchaser may reject it. METYCLE''s right to refuse subsequent performance under the statutory conditions shall remain unaffected.</p>
      <p>8.4. METYCLE shall be entitled to make the subsequent performance dependent upon payment of the claims due by the Purchaser, in particular the purchase price.</p>
      <p>8.5. Only if a defect has been actually present, METYCLE shall bear or reimburse the expenses necessary for the purpose of inspection and subsequent performance, in particular transport costs. Otherwise, METYCLE may demand reimbursement from the Purchaser of the costs incurred as a result of the unjustified request to remedy the defect if the Purchaser knew or could have recognized that there was actually no defect.</p>
      <p>8.6. If a reasonable period of time to be set by the Purchaser for the subsequent performance has expired unsuccessfully or is dispensable under the statutory provisions, the Purchaser may withdraw from the contract or reduce the purchase price in accordance with the statutory provisions. In the case of an insignificant defect, however, there shall be no right of withdrawal.</p>
      <p>8.7. Claims of the Purchaser for reimbursement of expenses pursuant to section 445a paragraph 1 BGB are excluded.</p>

      <h2>9. Liability in General</h2>
      <p>9.1. METYCLE assumes unlimited liability for willful intent and gross negligence on the part of METYCLE, its agents and legal representatives; METYCLE only accepts liability for simple negligence in the event of breaches concerning Cardinal Contractual Duties. "Cardinal Contractual Duties" are obligations which are indispensable for the fulfilment of the contract, and for which the Purchaser regularly relies and is entitled to rely on compliance.</p>
      <p>9.2. Liability for breaches of Cardinal Contractual Duties is restricted to the damages which are typical for this type of contract and which METYCLE should have been able to anticipate when establishing the contract based on the circumstances known at that time.</p>
      <p>9.3. The present limitations of liability do not apply if explicit guarantees have been made, for claims due to a lack of warranted qualities or for damages due to injury of life, body or health. Liability according to the product liability law also remains unaffected.</p>
      <p>9.4. The liability arrangement in this section 9 is conclusive. It applies with respect to all damage compensation claims, irrespective of their legal ground, particularly also with respect to pre-contractual claims or collateral contractual claims. This liability arrangement also applies in favor of legal representatives and agents of METYCLE if claims are asserted directly against them.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: contracts@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 4: Terms and Conditions Part 3 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h2>10. Transfer and Retention of Title</h2>
      <p>10.1. The following agreed retention of title (Eigentumsvorbehalt) serves to secure all respectively existing current and future claims of METYCLE against the Purchaser arising from a purchase contract ("Secured Claims").</p>
      <p>10.2. The Products shall remain the property of METYCLE until full payment of all Secured Claims. The Products as well as the goods replacing them in accordance with the following provisions shall hereinafter be referred to as "Reserved Products".</p>
      <p>10.3. The Purchaser shall store the Reserved Products free of charge for METYCLE.</p>
      <p>10.4. The Purchaser shall be entitled to process (verarbeiten) and sell the Reserved Products in the ordinary course of business until such time as the Realization Event (as defined below) occurs. Pledges and transfers of ownership by way of security are not permitted.</p>
      <p>10.5. If the Reserved Products are processed by the Purchaser, it is agreed that the processing shall be carried out in the name and for the account of METYCLE as manufacturer (Hersteller) and that METYCLE shall acquire direct ownership or – if the processing is carried out from materials of several owners or the value of the processed item is higher than the value of the goods subject to retention of title – co-ownership (Bruchteilseigentum) of the newly created item in the ratio of the value of the Reserved Products to the value of the newly created item. If no such acquisition of ownership should occur on the part of METYCLE, the Purchaser shall already now transfer its future ownership or – in the above ratio – co-ownership (Bruchteilseigentum) of the newly created item to METYCLE as security. If the Reserved Products are combined or inseparably mixed with other items to form a uniform item and if one of the items is to be regarded as the main item, so that METYCLE or the Purchaser acquires sole ownership, the party to whom the main item belongs shall transfer to the other party pro rata co-ownership (Bruchteilseigentum) of the uniform item in the ratio specified in this section 10.5.</p>
      <p>10.6. In the event of resale of the Reserved Products, the Purchaser hereby assigns to METYCLE by way of security the claim against the buyer ("Third Party Debtor(s)") arising therefrom – in the event of co-ownership (Bruchteilseigentum) of METYCLE in the reserved goods, in proportion to the co-ownership (Bruchteilseigentum) share. The same shall apply to other claims which replace the Reserved Products or otherwise arise with regard to the Reserved Products, such as insurance claims or claims in tort in the event of loss or destruction. METYCLE authorizes the Purchaser subject to revocation to collect the claims assigned to METYCLE in its own name. METYCLE may revoke this collection authorization only if the Realization Event (as defined below) occurs. In such a case, the Purchaser shall immediately provide METYCLE with a list of the claims assigned to METYCLE in accordance with this section 10.6, including name and address of the Third Party Debtors and the amount of the assigned claims. Furthermore, the Purchaser shall be obligated to inform the Third Party Debtors of the assignment and to provide METYCLE with the information and documents necessary for the assertion of its rights.</p>
      <p>10.7. If third parties seize the Reserved Products, in particular by way of attachment, the Purchaser shall immediately notify them of METYCLE''s ownership and inform METYCLE thereof in order to enable METYCLE to enforce its ownership rights. If the third party is not in a position to reimburse METYCLE for the judicial or extrajudicial costs incurred in this connection, the Purchaser shall be liable to METYCLE for such costs.</p>
      <p>10.8. METYCLE shall release the Reserved Products as well as the items or claims replacing them insofar as their value exceeds the amount of the Secured Claims by more than 50%. The choice of the items to be released thereafter shall lie with METYCLE.</p>
      <p>10.9. If METYCLE withdraws from a purchase contract in the event of a breach of the purchase contract by the Purchaser – in particular default of payment – ("Realization Event") METYCLE shall be entitled to demand the return of the Reserved Products.</p>

      <h2>11. Data Protection</h2>
      <p>11.1. METYCLE treats the Purchaser''s personal data in accordance with data protection laws. The applicable data protection regulations can be found in the privacy policy on METYCLE''s website.</p>
      <p>11.2. The Purchaser is obliged to comply with applicable data protection laws.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: contracts@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>

  <!-- Page 5: Terms and Conditions Part 4 -->
  <div class="page">
    <header class="top-bar">
      <div class="logo">
        <div class="logo-icon">m</div>
        <div class="logo-text">metycle</div>
      </div>
      <div class="top-address">METYCLE GmbH Venloer Str. 301-303
Cologne 50823 Germany</div>
    </header>
    <div class="tc-page">
      <h2>12. Confidentiality</h2>
      <p>12.1. "Confidential Information" means all trade secrets, the existence and content of the business relationship between the Parties as well as all other information that is non-public, by its nature to be deemed confidential, designated as confidential, and/or protected.</p>
      <p>12.2. Each Party is obliged:</p>
      <ul>
        <li>(a) to treat the other Party''s Confidential Information as strictly confidential, and only to use such information for the purpose of fulfilling the contractual obligations resulting from these GTC Sale;</li>
        <li>(b) to refrain from passing on or disclosing the other Party''s Confidential Information to third parties and to refrain from providing access to Confidential Information for third parties;</li>
        <li>(c) to adopt appropriate measures to prevent unauthorized persons from obtaining access to the other Party''s Confidential Information.</li>
      </ul>
      <p>12.3. The obligations listed in section 12.2 do not apply to Confidential Information:</p>
      <ul>
        <li>(a) that was general knowledge or generally accessible to the public before it was disclosed to the other Party, or that becomes public without violating any confidentiality obligations;</li>
        <li>(b) that was already known to the receiving Party before it was disclosed and it can be demonstrated that no confidentiality obligations were violated;</li>
        <li>(c) that was developed independently by the receiving party without the use or reference of the disclosing Party''s Confidential Information;</li>
        <li>(d) that is handed over or made accessible to the receiving Party by an authorized third party without violating any confidentiality obligations;</li>
        <li>(e) that must be disclosed due to mandatory statutory provisions or a court decision and/or a decision of an authority.</li>
      </ul>
      <p>12.4. The Parties shall ensure through suitable contractual arrangements that the employees and contractors working for them shall also, for the time period specified in section 12.5 of these GTC Sale, refrain from individual use or disclosure of Confidential Information. The Parties shall only disclose to employees or contractors Confidential Information to the extent such employees or contractors need to know the information for the fulfilment of the contract.</p>
      <p>12.5. The obligations under this section 12 of these GTC Sale continue to apply for a period of 3 (three) years after the termination of the contractual relationship between the Parties. Statutory provisions concerning the protection of trade secrets remain unaffected.</p>

      <h2>13. Final Provisions</h2>
      <p>13.1. The Purchaser only has a right to set-off, reduction and/or retention against METYCLE if its counterclaim has been legally established, is undisputed or acknowledged by METYCLE. Furthermore, the Purchaser may only exercise a right of retention if the counterclaim is based on the same contractual relationship. The Purchaser''s right to reclaim remuneration not actually owed shall remain unaffected by the limitation of this section.</p>
      <p>13.2. All declarations concerning and amendments to the contract including this form requirement must be submitted in text form (e.g., e-mail). This also applies to amendments to this paragraph 13.2.</p>
      <p>13.3. These GTC Sale are governed by the laws of the Federal Republic of Germany (excluding the United Nations Convention on Contracts for the International Sale of Goods).</p>
      <p>13.4. Cologne is the exclusive place of jurisdiction for all disputes arising out of or in connection with these GTC Sale. However, METYCLE is entitled to bring legal action at the registered seat of the Purchaser. If the registered seat of the Purchaser is outside the European Economic Area, all disputes arising out of or in connection with the contractual relationship shall be finally settled in accordance with the Arbitration Rules of the German Arbitration Institute (DIS) without recourse to the ordinary courts of law. The arbitral tribunal shall be comprised of a sole arbitrator. The seat of arbitration is Cologne, Germany, and the language of the arbitration shall be English.</p>
    </div>
    <footer class="bottom-bar">
      <div class="footer-columns">
        <div class="footer-col">METYCLE GmbH
Venloer Str. 301-303 | 50823 Cologne, Germany
Managing Directors: Rafael Suchan, Sebastian Brenner
Company Register: Cologne, HRB 110770
VAT-ID: DE354945597</div>
        <div class="footer-col">Bank: Deutsche Bank
IBAN: DE51 1007 0100 0327 4412 01
BIC: DEUTDEBB101

Bank: Sparkasse KölnBonn
IBAN: DE17 3705 0198 1936 9898 11
BIC: COLSDE33XXX</div>
        <div class="footer-col">Phone: +49 151 20244872
E-Mail: contracts@metycle.com
Website: www.metycle.com</div>
      </div>
    </footer>
  </div>
</body>
</html>',
  updated_at = NOW()
WHERE name = 'Sales Order';
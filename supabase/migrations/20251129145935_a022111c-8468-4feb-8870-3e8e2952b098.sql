-- Add all shipping locations needed for the dummy data
INSERT INTO shipping_location (name) VALUES
('Shanghai'),
('Mumbai'),
('Istanbul'),
('Cape Town'),
('Bangkok'),
('Oslo'),
('New Orleans'),
('Rotterdam'),
('Hamburg'),
('Veracruz Termina')
ON CONFLICT (name) DO NOTHING;

-- Insert 10 new Companies
INSERT INTO "Company" (name, kyb_status, kyb_effective_date, credit_limit, risk_rating, payment_terms, trade_credit_limit, current_exposure, trader_relationship_owner, total_traded_volume, amount_overdue, "total_MT_signed", "total_MT_loaded") VALUES
('Global Metals Trading Inc', 'Approved', '2024-01-15', 500000, 'Low', '30 days net', 450000, 280000, 'Harry', 1200000, 0, 2400, 2350),
('European Recycling Group', 'Approved', '2024-02-20', 750000, 'Medium', '45 days net', 600000, 420000, 'Eric', 1850000, 15000, 3200, 3180),
('Asia Pacific Commodities', 'Needs Review', '2024-03-10', 300000, 'High', '15 days net', 250000, 180000, 'Veli', 890000, 45000, 1500, 1450),
('North American Scrap Co', 'Approved', '2024-01-05', 1000000, 'Low', '60 days net', 900000, 650000, 'Anton', 2400000, 0, 4800, 4750),
('Middle East Metals LLC', 'Rejected', NULL, 200000, 'Very High', 'Prepayment', 150000, 120000, 'Armin', 450000, 80000, 800, 720),
('Latin American Traders SA', 'Approved', '2024-04-12', 400000, 'Medium', '30 days net', 350000, 220000, 'Christian', 980000, 12000, 1800, 1790),
('African Mining Exports', 'Needs Review', '2024-05-01', 350000, 'High', '20 days net', 280000, 190000, 'Khsitiz', 720000, 28000, 1200, 1150),
('Scandinavian Metals AB', 'Approved', '2024-02-28', 650000, 'Low', '45 days net', 580000, 380000, 'Harry', 1650000, 0, 3100, 3080),
('Southeast Asian Resources', 'Approved', '2024-03-22', 480000, 'Medium', '30 days net', 420000, 290000, 'Eric', 1150000, 8000, 2200, 2180),
('UK Metal Solutions Ltd', 'Approved', '2024-01-18', 820000, 'Low', '60 days net', 750000, 520000, 'Veli', 2100000, 0, 4200, 4150);

-- Insert Company Addresses
INSERT INTO "Company_address" (company_id, line1, city, region, country, post_code, contact_name_1, email_1, phone_1, job_position_1, is_primary, "VAT_id") 
SELECT 
  c.id, '123 Trade Avenue', 'New York', 'NY', 'United States', '10001', 
  'John Smith', 'contact@company.com', '+1-555-0100', 'CEO', true, 'VAT' || c.id::text
FROM "Company" c 
WHERE c.name IN ('Global Metals Trading Inc', 'European Recycling Group', 'Asia Pacific Commodities', 
                 'North American Scrap Co', 'Middle East Metals LLC', 'Latin American Traders SA',
                 'African Mining Exports', 'Scandinavian Metals AB', 'Southeast Asian Resources', 
                 'UK Metal Solutions Ltd');

-- Insert 10 diverse tickets
INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_from, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger, isri_grade, metal_form, country_of_origin)
SELECT 'Buy', 'Copper', 80, c.id, 'Shanghai', 'FOB', '2025-01-15', 3, 'Ship', 'Fixed', 'USD – US Dollar ($)', 9500, 'Loading', 'Before', 7, '0.15', 2, c.name, 'Approved', 'B2B', 760000, 'Booking', 'Candy', 'Baled', 'China'
FROM "Company" c WHERE c.name = 'Global Metals Trading Inc';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_to, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger)
SELECT 'Sell', 'Copper', 80, c.id, 'Rotterdam', 'CIF', '2025-01-20', 3, 'Ship', 'Fixed', 'USD – US Dollar ($)', 10200, 'ETA', 'Before', 5, '0.20', 2, c.name, 'Approved', 'B2B', 816000, 'Order Signed Date'
FROM "Company" c WHERE c.name = 'European Recycling Group';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_from, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, basis, payable_percent, fixation_method, lme_price, currency, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, pricing_option, lme_action_needed, downpayment_trigger, isri_grade, metal_form, country_of_origin)
SELECT 'Buy', 'Aluminium', 120, c.id, 'Mumbai', 'CFR', '2025-02-01', 4, 'Ship', 'Formula', '3M LME', 0.92, '1-day', 2650, 'USD – US Dollar ($)', 'BL issuance', 'After', 10, '0.10', 4, c.name, 'Pending Approval', 'B2B', 292320, 'Buyer', 'Yes', 'Invoice', 'Tense', 'Baled', 'India'
FROM "Company" c WHERE c.name = 'Asia Pacific Commodities';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_to, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, basis, premium_discount, fixation_method, lme_price, currency, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, pricing_option, downpayment_trigger, metal_form)
SELECT 'Sell', 'Zinc', 60, c.id, 'New Orleans', 'DDP', '2025-02-10', 2, 'Truck', 'Index', '3m LME Cash', -75, '5-day avg', 3100, 'USD – US Dollar ($)', 'ATA', 'Before', 3, '0.25', 7, c.name, 'Approved', 'B2B', 181500, 'Seller', 'Against Loading', 'Ingots'
FROM "Company" c WHERE c.name = 'North American Scrap Co';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_from, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger, isri_grade, metal_form, country_of_origin)
SELECT 'Buy', 'Brass', 45, c.id, 'Istanbul', 'FOB', '2025-01-25', 2, 'Ship', 'Fixed', 'EUR – Euro (€)', 5200, 'Inspection', 'After', 14, '0.30', 5, c.name, 'Pending Approval', 'Warehouse', 234000, 'Advance with Proforma', 'Ocean', 'Loose', 'Turkey'
FROM "Company" c WHERE c.name = 'Middle East Metals LLC';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_to, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger)
SELECT 'Sell', 'Aluminium', 150, c.id, 'Veracruz Termina', 'FOB', '2025-02-15', 5, 'Ship', 'Fixed', 'USD – US Dollar ($)', 2850, 'Loading', 'Before', 0, '0.20', 8, c.name, 'Approved', 'B2B', 427500, 'Order Signed Date'
FROM "Company" c WHERE c.name = 'Latin American Traders SA';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_from, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, basis, payable_percent, fixation_method, lme_price, currency, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, pricing_option, lme_action_needed, downpayment_trigger, metal_form, country_of_origin)
SELECT 'Buy', 'Copper', 95, c.id, 'Cape Town', 'CFR', '2025-02-20', 3, 'Ship', 'Formula', 'LME 3M', 0.97, '1-day', 10800, 'USD – US Dollar ($)', 'BL confirmed', 'After', 7, '0.10', 7, c.name, 'Approved', 'B2B', 994860, 'Buyer', 'No', 'Invoice', 'Baled', 'South Africa'
FROM "Company" c WHERE c.name = 'African Mining Exports';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_to, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger)
SELECT 'Sell', 'Steel', 200, c.id, 'Oslo', 'DDP', '2025-03-01', 6, 'Rail', 'Fixed', 'EUR – Euro (€)', 680, 'ETA', 'Before', 5, '0.15', 2, c.name, 'Approved', 'B2B', 136000, 'Order Signed Date'
FROM "Company" c WHERE c.name = 'Scandinavian Metals AB';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_from, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, basis, premium_discount, fixation_method, lme_price, currency, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, pricing_option, downpayment_trigger, metal_form, country_of_origin)
SELECT 'Buy', 'Zinc', 70, c.id, 'Bangkok', 'FOB', '2025-02-25', 3, 'Ship', 'Index', '3m LME', -60, 'Month avg', 3050, 'USD – US Dollar ($)', 'Loading', 'Before', 0, '0.20', 4, c.name, 'Draft', 'B2B', 209300, 'Buyer', 'Booking', 'Cathodes', 'Thailand'
FROM "Company" c WHERE c.name = 'Southeast Asian Resources';

INSERT INTO ticket (type, commodity_type, quantity, company_id, ship_to, incoterms, shipment_window, planned_shipments, transport_method, pricing_type, currency, signed_price, payment_trigger_event, payment_trigger_timing, payment_offset_days, down_payment_amount_percent, trader_id, client_name, status, transaction_type, signed_volume, downpayment_trigger)
SELECT 'Sell', 'Lead', 85, c.id, 'Hamburg', 'CIF', '2025-03-05', 3, 'Ship', 'Fixed', 'GBP – British Pound (£)', 1950, 'ATA', 'Before', 3, '0.25', 2, c.name, 'Approved', 'B2B', 165750, 'Against Loading'
FROM "Company" c WHERE c.name = 'UK Metal Solutions Ltd';

-- Create approval requests for pending tickets
INSERT INTO approval_requests (ticket_id, rule_triggered, required_approvers, status, current_approver_index)
SELECT t.id, 'Deal requires hedge + Counterparty KYB not approved', ARRAY['Hedging', 'CFO', 'Operations']::approver_role[], 'Pending Approval'::ticket_status, 0
FROM ticket t WHERE t.status = 'Pending Approval' AND t.client_name = 'Asia Pacific Commodities';

INSERT INTO approval_requests (ticket_id, rule_triggered, required_approvers, status, current_approver_index)
SELECT t.id, 'Non-standard pricing detected + Counterparty KYB not approved', ARRAY['Hedging', 'CFO', 'Operations']::approver_role[], 'Pending Approval'::ticket_status, 0
FROM ticket t WHERE t.status = 'Pending Approval' AND t.client_name = 'Middle East Metals LLC';
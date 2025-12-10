-- First, create invoices with different types linked to existing orders/bl_orders
-- Then create payments linked to those invoices

-- Create Downpayment invoices (linked to orders only)
INSERT INTO invoice (invoice_type, invoice_direction, order_id, company_name, currency, total_amount, issue_date, original_due_date, status, invoice_number) VALUES
('Downpayment', 'payable', '31983', 'Supplier Alpha Corp', 'USD', 25000, '2024-11-01', '2024-11-15', 'Paid', 'INV-DP-001'),
('Downpayment', 'receivable', '31983', 'Buyer Beta Ltd', 'USD', 27500, '2024-11-02', '2024-11-16', 'Paid', 'INV-DP-002'),
('Downpayment', 'payable', '32279', 'Metro Metals Supply', 'EUR', 18500, '2024-11-05', '2024-11-20', 'Paid', 'INV-DP-003'),
('Downpayment', 'receivable', '32279', 'European Recycling', 'EUR', 20350, '2024-11-06', '2024-11-21', 'Paid', 'INV-DP-004'),
('Downpayment', 'payable', '46056', 'Global Scrap Inc', 'USD', 32000, '2024-11-10', '2024-11-25', 'Paid', 'INV-DP-005'),
('Downpayment', 'receivable', '46056', 'Asian Metals Trading', 'USD', 35200, '2024-11-11', '2024-11-26', 'Paid', 'INV-DP-006');

-- Create Provisional invoices (linked to bl_orders)
INSERT INTO invoice (invoice_type, invoice_direction, order_id, bl_order_name, company_name, currency, total_amount, issue_date, original_due_date, status, invoice_number) VALUES
('Provisional', 'payable', '28878', '28878-1', 'African Mining Exports', 'USD', 85000, '2024-10-15', '2024-11-15', 'Paid', 'INV-PRV-001'),
('Provisional', 'receivable', '28878', '28878-1', 'Dimexa Holdings', 'USD', 93500, '2024-10-16', '2024-11-16', 'Paid', 'INV-PRV-002'),
('Provisional', 'payable', '41468', '41468-1,2,3', 'Copper Source Ltd', 'USD', 120000, '2024-10-20', '2024-11-20', 'Paid', 'INV-PRV-003'),
('Provisional', 'receivable', '41468', '41468-1,2,3', 'AL Qaryan Trading', 'USD', 132000, '2024-10-21', '2024-11-21', 'Paid', 'INV-PRV-004'),
('Provisional', 'payable', '32278', '32278-1', 'Metro Metals (UK)', 'GBP', 65000, '2024-10-25', '2024-11-25', 'Paid', 'INV-PRV-005'),
('Provisional', 'receivable', '32278', '32278-1', 'European Recycling Group', 'GBP', 71500, '2024-10-26', '2024-11-26', 'Paid', 'INV-PRV-006');

-- Create Final invoices (linked to bl_orders)
INSERT INTO invoice (invoice_type, invoice_direction, order_id, bl_order_name, company_name, currency, total_amount, issue_date, original_due_date, status, invoice_number) VALUES
('Final', 'payable', '28878', '28878-2,3', 'African Mining Exports', 'USD', 87500, '2024-11-20', '2024-12-20', 'Paid', 'INV-FNL-001'),
('Final', 'receivable', '28878', '28878-2,3', 'Dimexa Holdings', 'USD', 96250, '2024-11-21', '2024-12-21', 'Paid', 'INV-FNL-002'),
('Final', 'payable', '41048', '41048-1,2', 'Varron Autokast', 'EUR', 95000, '2024-11-22', '2024-12-22', 'Paid', 'INV-FNL-003'),
('Final', 'receivable', '41048', '41048-1,2', 'DFF Trading', 'EUR', 104500, '2024-11-23', '2024-12-23', 'Paid', 'INV-FNL-004'),
('Final', 'payable', '32279', '32279-1,2', 'Global Copper Supply', 'USD', 145000, '2024-11-25', '2024-12-25', 'Paid', 'INV-FNL-005'),
('Final', 'receivable', '32279', '32279-1,2', 'Asian Metals Corp', 'USD', 159500, '2024-11-26', '2024-12-26', 'Pending', 'INV-FNL-006');

-- Create Credit Note invoices (linked to bl_orders)
INSERT INTO invoice (invoice_type, invoice_direction, order_id, bl_order_name, company_name, currency, total_amount, issue_date, original_due_date, status, invoice_number, note_reason) VALUES
('Credit Note', 'payable', '28878', '28878-4,5', 'African Mining Exports', 'USD', -2500, '2024-11-28', '2024-12-15', 'Paid', 'INV-CN-001', 'Quality adjustment'),
('Credit Note', 'receivable', '41468', '41468-1,2,3', 'AL Qaryan Trading', 'USD', -3200, '2024-11-29', '2024-12-16', 'Paid', 'INV-CN-002', 'Weight variance'),
('Credit Note', 'payable', '32278', '32278-2', 'Metro Metals (UK)', 'GBP', -1800, '2024-11-30', '2024-12-17', 'Paid', 'INV-CN-003', 'Price correction'),
('Credit Note', 'receivable', '41048', '41048-3', 'DFF Trading', 'EUR', -2100, '2024-12-01', '2024-12-18', 'Pending', 'INV-CN-004', 'Contract adjustment');

-- Create Debit Note invoices (linked to bl_orders)
INSERT INTO invoice (invoice_type, invoice_direction, order_id, bl_order_name, company_name, currency, total_amount, issue_date, original_due_date, status, invoice_number, note_reason) VALUES
('Debit Note', 'receivable', '28878', '28878-1', 'Dimexa Holdings', 'USD', 1500, '2024-11-25', '2024-12-10', 'Paid', 'INV-DN-001', 'Additional handling charges'),
('Debit Note', 'payable', '41468', '41468-1,2,3', 'Copper Source Ltd', 'USD', 2200, '2024-11-26', '2024-12-11', 'Paid', 'INV-DN-002', 'Demurrage charges'),
('Debit Note', 'receivable', '32279', '32279-1,2', 'Asian Metals Corp', 'USD', 1850, '2024-11-27', '2024-12-12', 'Paid', 'INV-DN-003', 'Late delivery penalty'),
('Debit Note', 'payable', '41048', '41048-1,2', 'Varron Autokast', 'EUR', 1200, '2024-11-28', '2024-12-13', 'Pending', 'INV-DN-004', 'Storage fees');

-- Now create 30 payment records linked to the newly created invoices
-- Using a CTE to get the invoice IDs we just created

WITH new_invoices AS (
  SELECT id, invoice_type, invoice_direction, company_name, currency, total_amount
  FROM invoice 
  WHERE invoice_number LIKE 'INV-DP-%' 
     OR invoice_number LIKE 'INV-PRV-%' 
     OR invoice_number LIKE 'INV-FNL-%' 
     OR invoice_number LIKE 'INV-CN-%' 
     OR invoice_number LIKE 'INV-DN-%'
  ORDER BY id
)
INSERT INTO payment (invoice_id, payment_type, payment_direction, company_name, currency, total_amount_paid, paid_date, bank_reference, reference_note)
SELECT 
  id,
  CASE 
    WHEN invoice_type = 'Downpayment' THEN 'Wire Transfer'
    WHEN invoice_type = 'Provisional' THEN 'Wire Transfer'
    WHEN invoice_type = 'Final' THEN 'Wire Transfer'
    WHEN invoice_type = 'Credit Note' THEN 'Offset'
    WHEN invoice_type = 'Debit Note' THEN 'Wire Transfer'
    ELSE 'Wire Transfer'
  END,
  invoice_direction,
  company_name,
  currency,
  ABS(total_amount),
  CURRENT_DATE - (random() * 30)::integer,
  'BNK-' || LPAD((random() * 999999)::integer::text, 6, '0'),
  'Payment for ' || invoice_type || ' invoice'
FROM new_invoices
WHERE total_amount IS NOT NULL
LIMIT 30;
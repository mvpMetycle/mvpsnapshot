UPDATE document_templates 
SET content = REPLACE(
  content, 
  '<p><strong>Payment terms:</strong> {{formatted_payment_terms}}</p>',
  '<p><strong>Payment terms:</strong> {{formatted_payment_terms}}</p>
        <p><strong>Pricing basis:</strong> {{basis_with_payable}}</p>'
),
updated_at = now()
WHERE name = 'Sales Order';
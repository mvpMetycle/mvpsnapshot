-- Update Sales Order template to use formatted_payment_terms and add product_details
UPDATE document_templates
SET content = REPLACE(
  REPLACE(
    content,
    '<p><strong>Payment terms:</strong> {{payment_terms}}</p>',
    '<p><strong>Payment terms:</strong> {{formatted_payment_terms}}</p>
        <p><strong>Product Details:</strong> {{ticket_product_details}}</p>'
  ),
  '{{payment_terms}}',
  '{{formatted_payment_terms}}'
),
updated_at = now()
WHERE name = 'Sales Order';
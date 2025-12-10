-- Fix white text issue in SO/PO templates by ensuring only field tags are invisible
-- The issue was that entire paragraphs were being styled with white color

-- Update Purchase Order template - fix signature sections
UPDATE document_templates
SET content = REPLACE(
  REPLACE(
    content,
    '<p style="margin-top: 20px; color: white;">{signature__________}</p>',
    '<p style="margin-top: 20px;"><span style="font-size: 1px; color: white;">{signature__________}</span></p>'
  ),
  '<span style="color: white;">{date______}</span>',
  '<span style="font-size: 1px; color: white;">{date______}</span>'
)
WHERE name = 'Purchase Order';

-- Update Sales Order template - fix signature sections  
UPDATE document_templates
SET content = REPLACE(
  REPLACE(
    content,
    '<p style="margin-top: 20px; color: white;">{signature__________}</p>',
    '<p style="margin-top: 20px;"><span style="font-size: 1px; color: white;">{signature__________}</span></p>'
  ),
  '<span style="color: white;">{date______}</span>',
  '<span style="font-size: 1px; color: white;">{date______}</span>'
)
WHERE name = 'Sales Order';

-- Add PandaDoc signature field tags to Purchase Order template
UPDATE document_templates
SET content = REPLACE(
  REPLACE(
    content,
    '<div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 40px;">Date, place, signature: {{current_date}}</p>
          </div>',
    '<div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 20px; color: white;">{signature__________}</p>
            <p style="margin-top: 10px;">Date: <span style="color: white;">{date______}</span></p>
          </div>'
  ),
  '<div class="sig-box">
            <p><strong>{{seller_name}} / {{seller_contact_name}}</strong></p>
            <p style="margin-top: 40px;">Date, place, signature:</p>
          </div>',
  '<div class="sig-box">
            <p><strong>{{seller_name}} / {{seller_contact_name}}</strong></p>
            <p style="margin-top: 20px; color: white;">{signature__________}</p>
            <p style="margin-top: 10px;">Date: <span style="color: white;">{date______}</span></p>
          </div>'
)
WHERE name = 'Purchase Order';

-- Add PandaDoc signature field tags to Sales Order template
UPDATE document_templates
SET content = REPLACE(
  REPLACE(
    content,
    '<div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 40px;">Date, place, signature: {{current_date}}</p>
          </div>',
    '<div class="sig-box">
            <p><strong>METYCLE GmbH</strong></p>
            <p style="margin-top: 20px; color: white;">{signature__________}</p>
            <p style="margin-top: 10px;">Date: <span style="color: white;">{date______}</span></p>
          </div>'
  ),
  '<div class="sig-box">
            <p><strong>{{purchaser_name}} / {{purchaser_contact_name}}</strong></p>
            <p style="margin-top: 40px;">Date, place, signature:</p>
          </div>',
  '<div class="sig-box">
            <p><strong>{{purchaser_name}} / {{purchaser_contact_name}}</strong></p>
            <p style="margin-top: 20px; color: white;">{signature__________}</p>
            <p style="margin-top: 10px;">Date: <span style="color: white;">{date______}</span></p>
          </div>'
)
WHERE name = 'Sales Order';

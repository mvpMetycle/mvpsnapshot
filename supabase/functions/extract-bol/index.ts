import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_EXTRACTION_PROMPT = `You are an expert logistics and trade documentation analyst.

You receive:
- A PDF Bill of Lading (BoL) or similar transport document for a shipment of scrap metal containers.

Your task:
- Carefully read the entire document (including headers, tables, side notes, stamps, and small print).
- Extract as many relevant data points as possible to populate a BL Order Details record in the METYCLE Trading Platform.
- Return ONLY a single JSON object following the exact schema and rules below. Do not include any explanation outside the JSON.

------------------------------
CONTEXT / DEFINITIONS
------------------------------

- This is a shipment of scrap metal, typically in one or more containers.
- A BoL may contain:
  - Shipper, Consignee, Notify party
  - Ports (loading, discharge, final destination)
  - Vessel name, voyage number, dates (on board, sailing, arrival)
  - Container numbers, seal numbers, weights and quantities
  - Commodity descriptions
  - Issue date and place of the bill of lading
- Some financial fields (buy/sell price, revenue, cost, final invoice ID) may NOT be on the BoL itself. Only fill them if they are clearly present.

------------------------------
JSON SCHEMA TO RETURN
------------------------------

Return exactly ONE JSON object with the following shape:

{
  "basic_information": {
    "bl_order_name": string | null,
    "order_id": string | null,
    "status": string | null,
    "bl_number": string | null,
    "bl_issue_date": string | null
  },
  "shipping_information": {
    "port_of_loading": string | null,
    "port_of_discharge": string | null,
    "final_destination": string | null,
    "loading_date": string | null,
    "shipper": string | null,
    "shipping_line": string | null,
    "country_of_origin": string | null,
    "hs_code": number | null,
    "applicable_free_days": number | null,
    "consignee_name": string | null,
    "consignee_address": string | null,
    "consignee_contact_person_name": string | null,
    "consignee_contact_person_email": string | null,
    "notify_name": string | null,
    "notify_address": string | null,
    "notify_contact_person_name": string | null,
    "notify_contact_person_email": string | null
  },
  "schedule": {
    "etd": string | null,
    "atd": string | null,
    "eta": string | null,
    "ata": string | null
  },
  "quantities": {
    "total_quantity_mt": number | null,
    "container_count": number | null,
    "number_of_packages": number | null,
    "commodity_description": string | null
  },
  "containers": [
    {
      "container_number": string | null,
      "seal_number": string | null,
      "net_weight": number | null,
      "gross_weight": number | null
    }
  ],
  "financial": {
    "buy_price": number | null,
    "sell_price": number | null,
    "revenue": number | null,
    "cost": number | null,
    "final_invoice_id": string | null
  },
  "documents_and_notes": {
    "bl_url": string | null,
    "notes": string | null
  },
  "metadata": {
    "created_at": string | null,
    "updated_at": string | null
  }
}

------------------------------
FIELD-BY-FIELD EXTRACTION RULES
------------------------------

GENERAL
- If a field is not on the document or cannot be determined with high confidence, set it to null.
- Do NOT fabricate information.
- Strip all leading/trailing whitespace.
- Preserve original casing for names and port names.
- All dates must be in ISO 8601 format: "YYYY-MM-DD".

BASIC INFORMATION
- "bl_order_name": If an internal reference or "B/L Reference" / "Booking Number" clearly identifies this shipment, use that. Otherwise null.
- "order_id": Use any clearly labeled "Order No.", "Order Number", "Purchase Order No." or similar. If multiple exist, prefer the one most clearly tied to this shipment.
- "status": Only fill if document explicitly states a shipment status that fits, like "SURRENDERED", "RECEIVED FOR SHIPMENT", "ON BOARD", etc. Otherwise null.
- "bl_number": Use the main Bill of Lading number from the document, typically near the top.
- "bl_issue_date": Use the date the BoL is issued or signed. If there is "Date of Issue", "Place and Date of Issue", or a signature date, convert to ISO.

SHIPPING INFORMATION
- "port_of_loading": Port where goods are loaded on vessel (e.g. "Port of Loading", "POL").
- "port_of_discharge": Port where goods are discharged from vessel (e.g. "Port of Discharge", "POD").
- "final_destination": If there is a distinct "Place of Delivery", "Final Destination", or similar, use it. Otherwise null.
- "loading_date": If the BoL clearly states a loading date, on-board date, or similar, convert to ISO and use it. Otherwise null.
- "shipper": The name of the shipper/exporter (usually at the top of the BoL).
- "shipping_line": The name of the shipping line/carrier operating the vessel.
- "country_of_origin": The country where the goods originated from.
- "hs_code": The HS Code (Harmonized System Code) for the goods, typically a 4-10 digit number identifying the commodity classification. Look for "HS Code", "Tariff Code", "Commodity Code", or similar fields. Return as a number without leading zeros issues (e.g., 72044900).
- "applicable_free_days": The number of free days for demurrage/detention at the port, often found as "Free Days", "Demurrage Free Days", "Free Time", or similar. Return as a number (e.g., 10, 14, 21).
- "consignee_name": The name of the consignee (receiver of goods).
- "consignee_address": The full address of the consignee.
- "consignee_contact_person_name": Contact person name for the consignee.
- "consignee_contact_person_email": Contact email for the consignee.
- "notify_name": The name of the notify party (if different from consignee).
- "notify_address": The address of the notify party.
- "notify_contact_person_name": Contact person name for notify party.
- "notify_contact_person_email": Contact email for notify party.

SCHEDULE
- "etd": If a planned or estimated departure date is present (ETD, "Estimated Time of Departure"), convert to ISO.
- "atd": If an actual departure/on-board date is present (ATD, "Actual Time of Departure", "On Board Date"), convert to ISO.
- "eta": If a planned or estimated arrival date is present (ETA, "Estimated Time of Arrival"), convert to ISO.
- "ata": If an actual arrival date is mentioned (ATA, "Actual Time of Arrival"), convert to ISO.

QUANTITIES
- "total_quantity_mt":
  - Prefer a clearly labeled net or actual weight for the cargo in metric tons.
  - If only kilograms are given, convert to metric tons (divide by 1000).
  - If both gross and net weights are present, prefer NET unless it is clearly not the cargo weight.
- "container_count":
  - Count the number of distinct container numbers listed, or use any explicit "Total No. of Containers" or similar field.
- "number_of_packages":
  - Total number of packages/pieces in the shipment (e.g., "200 packages", "50 pieces").
- "commodity_description":
  - Take the description text that best represents the cargo, e.g. "Mixed Scrap Metal", "Aluminum Scrap", "Copper Scrap", etc.
  - If there are multiple lines, join them into one string separated by commas.

CONTAINERS (array of container objects)
- Extract ALL containers mentioned in the document. Each container should be a separate object in the array.
- "container_number": The container number/ID (e.g., "TEMU1234567", "CSQU9876543")
- "seal_number": The seal number for this container (e.g., "SL123456")
- "net_weight": Net weight of THIS container in metric tons (convert from kg if needed)
- "gross_weight": Gross weight of THIS container in metric tons (convert from kg if needed)
- If containers are listed in a table, extract each row as a separate container object
- Set all fields to null if not present for a specific container

FINANCIAL
- Only fill these when they are clearly present in the document. If you cannot find them, set to null.
- "buy_price": Numeric purchase price of the cargo (no currency symbol). If multiple, choose the one that best represents total buy price for this BoL.
- "sell_price": Numeric sale price of the cargo (no currency symbol).
- "revenue": If the document clearly states revenue or profit, use it; otherwise null.
- "cost": If specific costs attributable to this shipment (e.g. freight cost total) are clearly labeled, use numeric value; otherwise null.
- "final_invoice_id": If a commercial invoice number is clearly linked to this shipment (e.g. "Invoice No." or "Final Invoice No."), use the text.

DOCUMENTS & NOTES
- "bl_url": Usually not part of the BoL; set to null unless an explicit URL for the BoL is printed.
- "notes": Any relevant free-text information that might be useful for an operator (e.g. "Telex release", special conditions, remarks). Combine multiple note fields into one string separated by newlines.

METADATA
- "created_at" and "updated_at":
  - Normally these are managed by the application. Only use non-null values if some system or stamp on the BoL clearly indicates document creation or last update date.
  - Convert to ISO; otherwise set to null.

------------------------------
OUTPUT RULES
------------------------------

- Return ONLY the JSON object, no extra text.
- Ensure it is valid JSON:
  - Use double quotes for all keys and string values.
  - Do not include comments.
- For any numeric fields, return numbers (not strings).
- For missing or unknown values, use null.

If you are unsure, prefer null instead of guessing.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing file:', file.name, file.type, file.size);

    // Convert PDF to base64 - process in chunks to avoid stack overflow
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid "Maximum call stack size exceeded"
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

    console.log('Calling Lovable AI for extraction...');

    // Call Lovable AI with the PDF using native PDF support
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: GEMINI_EXTRACTION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    // Check if response has content before parsing
    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      console.error('AI gateway returned empty response');
      throw new Error('AI gateway returned empty response. The request may have timed out.');
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Response text:', responseText);
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      throw new Error(`Invalid JSON response from AI gateway: ${errorMessage}`);
    }
    
    console.log('AI response received');
    
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI content:', content);

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Content:', content);
      
      // Retry with explicit instruction
      console.log('Retrying with explicit JSON instruction...');
      const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: GEMINI_EXTRACTION_PROMPT + '\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no explanations, just the JSON object.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        const retryContent = retryResult.choices?.[0]?.message?.content;
        const retryJsonMatch = retryContent.match(/\{[\s\S]*\}/);
        if (retryJsonMatch) {
          extractedData = JSON.parse(retryJsonMatch[0]);
        } else {
          throw new Error('Failed to extract valid JSON after retry');
        }
      } else {
        throw new Error('Extraction failed: Invalid JSON response from AI');
      }
    }

    console.log('Extraction successful:', JSON.stringify(extractedData, null, 2));

    return new Response(
      JSON.stringify({ data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-bol function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

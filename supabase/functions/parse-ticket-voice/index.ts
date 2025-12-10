import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcribedText, context } = await req.json();

    if (!transcribedText) {
      throw new Error("No transcribed text provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Parsing ticket from voice input:", transcribedText.substring(0, 100) + "...");

    const systemPrompt = `You are an AI assistant for a metal trading platform. Parse natural language trade descriptions into structured ticket fields with confidence scoring.

CRITICAL RULES:
1. ONLY extract fields that are EXPLICITLY MENTIONED in the voice input
2. Do NOT infer, guess, or assume fields that are not directly stated
3. Set confidence to 0 and value to null for any field NOT mentioned in the input
4. Do NOT extract currency unless the user specifically mentions a currency (USD, EUR, dollars, euros, etc.)
5. Do NOT extract default values or make assumptions about missing information

CRITICAL FIELDS TO EXTRACT (highest priority - ONLY if mentioned):
1. QUANTITY/TONNAGE: Extract any mention of weight/volume as "quantity" field
   - Look for: tons, MT, metric tons, tonnes, kilograms, kg, pounds, lbs, containers
   - Examples: "100 tons", "50 MT", "200 metric tonnes", "5 containers of 20MT each" → quantity: 100
   - Always extract numerical values for quantities mentioned

2. COMMODITY/MATERIAL: Extract the metal type as "commodity_type" field
   - Look for metal names in ANY form: aluminum/aluminium, copper, zinc, brass, steel, scrap metal, mixed metals, etc.
   - Match to valid options: "Aluminium", "Mixed metals", "Zinc", "Magnesium", "Lead", "Nickel/stainless/hi-temp", "Copper", "Brass", "Steel", "Iron"
   - Examples: "copper scrap" → "Copper", "aluminum cans" → "Aluminium", "mixed scrap" → "Mixed metals"

For each field you extract, return both the value and a confidence score (0-100) based on these rules:
- 95-100%: Exact match to valid enum values or database entries AND explicitly mentioned
- 70-94%: Fuzzy match or strongly implied value AND explicitly mentioned
- 40-69%: Extracted but uncertain or doesn't match known values exactly
- 0%: Field was NOT mentioned in the input (set value to null)

Available options for fields (match EXACTLY for high confidence):
- type: "Buy" or "Sell" (ONLY if explicitly stated: "buy", "purchase", "sell", "selling", etc.)
- commodity_type: "Aluminium", "Mixed metals", "Zinc", "Magnesium", "Lead", "Nickel/stainless/hi-temp", "Copper", "Brass", "Steel", "Iron"
- transaction_type: "B2B" or "Warehouse" (ONLY if explicitly mentioned)
- metal_form: "Baled", "Loose", "Not specified", "Jumbo bag", "Ingots", "Cathodes", "Sows", "T bars"
- incoterms: "CFR", "CIF", "CIP", "CPT", "DAP", "DDP", "DPU", "EWX", "FAS", "FCA", "FOB"
- currency: "USD", "EUR", "GBP", "CNY", "JPY", "AUD", "CAD", "CHF" (ONLY if user mentions dollars, USD, euros, EUR, etc.)
- pricing_type: "Fixed", "Formula", "Index" (ONLY if pricing is mentioned)
- transport_method: "Ship", "Truck", "Rail", "Barge", "Multi modal"
- payment_trigger_event: "ATA", "BL confirmed", "BL issuance", "BL release", "Booking", "Customs Clearance", "Delivery Note Issued (CMR)", "DP (documents against payment)", "ETA", "ETD (vessel departure)", "Fixation", "Inspection", "Invoice", "Loading", "Other - custom", "Sales Order Signed Date", "Seal"
- payment_trigger_timing: "Before" or "After"
- fixation_method: "1-day", "5-day avg", "Month avg", "Custom"

Available companies (match these for high confidence): ${context.companies?.map((c: any) => c.name).join(", ")}
Available shipping locations (match these for high confidence): ${context.shippingLocations?.map((l: any) => l.name).join(", ")}

EXAMPLES:
INPUT: "I want to buy 500 tons of copper"
OUTPUT: 
- quantity: {value: 500, confidence: 100}
- commodity_type: {value: "Copper", confidence: 100}
- type: {value: "Buy", confidence: 100}
- currency: {value: null, confidence: 0} ← NOT MENTIONED
- pricing_type: {value: null, confidence: 0} ← NOT MENTIONED

INPUT: "Selling 200MT aluminum scrap"
OUTPUT:
- quantity: {value: 200, confidence: 100}
- commodity_type: {value: "Aluminium", confidence: 95}
- type: {value: "Sell", confidence: 100}
- currency: {value: null, confidence: 0} ← NOT MENTIONED

INPUT: "22 tons of aluminum. 30 tons of copper."
OUTPUT:
- quantity: {value: 22, confidence: 100}
- commodity_type: {value: "Aluminium", confidence: 100}
- notes: {value: "Also mentioned: 30 tons of copper", confidence: 90}
- currency: {value: null, confidence: 0} ← NOT MENTIONED
- type: {value: null, confidence: 0} ← NOT MENTIONED

Return each field as an object with "value" and "confidence" properties. If a field is NOT mentioned in the input, ALWAYS set value to null and confidence to 0.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcribedText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_ticket",
              description: "Parse voice input into structured ticket fields with confidence scores",
              parameters: {
                type: "object",
                properties: {
                  type: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["Buy", "Sell"] },
                      confidence: { type: "number", description: "0-100 confidence score" },
                    },
                  },
                  transaction_type: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["B2B", "Warehouse"] },
                      confidence: { type: "number" },
                    },
                  },
                  commodity_type: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  metal_form: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  quantity: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      confidence: { type: "number" },
                    },
                  },
                  currency: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  pricing_type: {
                    type: "object",
                    properties: {
                      value: { type: "string", enum: ["Fixed", "Formula", "Index"] },
                      confidence: { type: "number" },
                    },
                  },
                  signed_price: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      confidence: { type: "number" },
                    },
                  },
                  lme_price: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      confidence: { type: "number" },
                    },
                  },
                  payable_percent: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      confidence: { type: "number" },
                    },
                  },
                  premium_discount: {
                    type: "object",
                    properties: {
                      value: { type: "number" },
                      confidence: { type: "number" },
                    },
                  },
                  company_name: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  country_of_origin: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  incoterms: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  ship_from: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  ship_to: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  transport_method: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  shipment_window: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  payment_trigger_event: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  payment_trigger_timing: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  basis: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  product_details: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                  notes: {
                    type: "object",
                    properties: {
                      value: { type: "string" },
                      confidence: { type: "number" },
                    },
                  },
                },
                required: [],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_ticket" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", errorText);
      throw new Error(`AI gateway error: ${errorText}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call returned from AI");
    }

    const parsedFields = JSON.parse(toolCall.function.arguments);
    console.log("Parsed fields:", parsedFields);

    return new Response(
      JSON.stringify({
        parsedFields,
        originalText: transcribedText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in parse-ticket-voice:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

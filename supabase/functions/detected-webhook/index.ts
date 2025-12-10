import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse webhook payload from Detected
    const payload = await req.json();
    
    console.log('Received Detected webhook:', JSON.stringify(payload, null, 2));

    // Extract profile data from webhook
    const {
      id: profileId,
      review_status,
      risk,
      customer_reference,
    } = payload.data || payload;

    if (!profileId || !customer_reference) {
      console.error('Missing required fields in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract company ID from customer_reference (format: "metycle-{companyId}")
    const companyId = customer_reference.replace('metycle-', '');

    // Update company record with new KYB status
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: updateError } = await supabase
      .from('Company')
      .update({
        detected_review_status: review_status,
        detected_risk_category: risk?.category || null,
        detected_risk_label: risk?.label || null,
        detected_last_checked: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating company:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update company data', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully updated company ${companyId} with status: ${review_status}`);

    // Return 200 OK to acknowledge webhook receipt
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

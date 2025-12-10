import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DETECTED_API_URL = 'https://api.detected.app/api/v2/public';
const DETECTED_API_KEY = Deno.env.get('DETECTED_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, companyId, companyName, countryCode, city, lookupId, responseId } = await req.json();

    // Handle lookup action
    if (action === 'lookup') {
      if (!companyName || !countryCode || !city) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: companyName, countryCode, city' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Searching for company: ${companyName} in ${city}, ${countryCode}`);

      const searchResponse = await fetch(`${DETECTED_API_URL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DETECTED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'company',
          name: companyName,
          address: {
            country_code: countryCode,
            city: city,
          },
        }),
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Detected search error:', errorText);
        
        // If company not found, return success with empty results instead of error
        if (searchResponse.status === 404 || errorText.includes('Company not found')) {
          return new Response(
            JSON.stringify({ success: true, lookupId: null, responses: [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to search company in Detected', details: errorText }),
          { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      console.log('Search results:', JSON.stringify(searchData, null, 2));

      // Detected API returns companies in 'data' array, not 'responses'
      const companies = searchData.data || [];
      
      if (companies.length === 0) {
        return new Response(
          JSON.stringify({ success: true, lookupId: searchData.lookup_id, responses: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Map Detected API format to frontend format
      const responses = companies.map((company: any) => ({
        response_id: company.response_id?.toString() || company.provider_reference,
        name: company.name,
        provider: company.provider,
        confidence: company.confidence,
        registration_number: company.company_reference,
        address: {
          country_code: company.jurisdiction_code,
          locality: company.city,
        },
      }));

      return new Response(
        JSON.stringify({
          success: true,
          lookupId: searchData.lookup_id,
          responses: responses,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle create-profile action
    if (action === 'create-profile') {
      if (!companyId || !lookupId || !responseId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: companyId, lookupId, responseId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Creating profile for company ${companyId} with response ${responseId}`);

      // Convert lookupId and responseId to numbers as Detected API expects numbers, not strings
      const lookupIdNumber = parseInt(lookupId, 10);
      const responseIdNumber = parseInt(responseId, 10);
      
      if (isNaN(lookupIdNumber) || isNaN(responseIdNumber)) {
        return new Response(
          JSON.stringify({ error: 'Invalid lookup_id or response_id format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileResponse = await fetch(`${DETECTED_API_URL}/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DETECTED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_reference: `metycle-${companyId}`,
          lookup_id: lookupIdNumber,
          response_id: responseIdNumber,
        }),
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Detected profile creation error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create profile in Detected', details: errorText }),
          { status: profileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileData = await profileResponse.json();
      console.log('Profile data:', JSON.stringify(profileData, null, 2));

      // Update company in Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { error: updateError } = await supabase
        .from('Company')
        .update({
          detected_profile_id: profileData.data?.id,
          detected_review_status: profileData.data?.review_status,
          detected_risk_category: profileData.data?.risk?.category || null,
          detected_risk_label: profileData.data?.risk?.label || null,
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

      return new Response(
        JSON.stringify({
          success: true,
          profileId: profileData.data?.id,
          reviewStatus: profileData.data?.review_status,
          riskCategory: profileData.data?.risk?.category || null,
          riskLabel: profileData.data?.risk?.label || null,
          lastChecked: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle refresh-profile action
    if (action === 'refresh-profile') {
      const { profileId } = await req.json();
      
      if (!companyId || !profileId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: companyId, profileId' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Refreshing profile ${profileId} for company ${companyId}`);

      const profileResponse = await fetch(`${DETECTED_API_URL}/profiles/${profileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DETECTED_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Detected profile fetch error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profile from Detected', details: errorText }),
          { status: profileResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileData = await profileResponse.json();
      console.log('Refreshed profile data:', JSON.stringify(profileData, null, 2));

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { error: updateError } = await supabase
        .from('Company')
        .update({
          detected_review_status: profileData.data?.review_status,
          detected_risk_category: profileData.data?.risk?.category || null,
          detected_risk_label: profileData.data?.risk?.label || null,
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

      return new Response(
        JSON.stringify({
          success: true,
          reviewStatus: profileData.data?.review_status,
          riskCategory: profileData.data?.risk?.category || null,
          riskLabel: profileData.data?.risk?.label || null,
          lastChecked: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is not recognized
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "lookup" or "create-profile"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detected-kyb function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

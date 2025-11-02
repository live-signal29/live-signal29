import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get('NOWPAYMENTS_PUBLIC_KEY');
    
    if (!publicKey) {
      throw new Error('NOWPAYMENTS_PUBLIC_KEY not configured');
    }

    console.log('Fetching available cryptocurrencies from NOWPayments');

    const response = await fetch('https://api.nowpayments.io/v1/currencies', {
      method: 'GET',
      headers: {
        'x-api-key': publicKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NOWPayments API error:', errorText);
      throw new Error(`NOWPayments API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched currencies:', data.currencies?.length || 0);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in nowpayments-currencies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
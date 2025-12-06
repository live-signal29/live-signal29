import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!apiKey) {
      console.error('NOWPAYMENTS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service temporarily unavailable. Please contact support.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('User authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { price_amount, pay_currency } = await req.json();

    if (!price_amount || !pay_currency) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment details provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating payment for user ${user.id}: ${price_amount} USD in ${pay_currency}`);

    const orderId = `INVEST_${user.id}_${Date.now()}`;

    const paymentData = {
      price_amount: parseFloat(price_amount),
      price_currency: 'usd',
      pay_currency: pay_currency,
      order_id: orderId,
      order_description: 'Investment plan purchase',
    };

    const response = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NOWPayments API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Payment service temporarily unavailable. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const paymentResult = await response.json();
    console.log('Payment created successfully:', paymentResult.payment_id);

    // Store deposit record
    const { error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: parseFloat(price_amount),
        currency: 'usd',
        pay_currency: pay_currency,
        payment_id: paymentResult.payment_id,
        pay_address: paymentResult.pay_address,
        pay_amount: paymentResult.pay_amount,
        status: 'pending',
      });

    if (depositError) {
      console.error('Error storing deposit:', depositError);
      // Don't expose internal error to client - payment was created successfully
    }

    return new Response(
      JSON.stringify(paymentResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in nowpayments-create-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Payment processing failed. Please try again.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

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

    const { payment_id } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'Payment ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Checking payment status for ${payment_id}`);

    const response = await fetch(`https://api.nowpayments.io/v1/payment/${payment_id}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NOWPayments API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Unable to verify payment status. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const paymentStatus = await response.json();
    console.log('Payment status:', paymentStatus.payment_status);

    // Update deposit status
    const { error: updateError } = await supabase
      .from('deposits')
      .update({ status: paymentStatus.payment_status })
      .eq('payment_id', payment_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating deposit:', updateError);
      // Don't expose internal error to client
    }

    // If payment is finished, update user balance
    if (paymentStatus.payment_status === 'finished') {
      const { data: deposit } = await supabase
        .from('deposits')
        .select('amount')
        .eq('payment_id', payment_id)
        .eq('user_id', user.id)
        .single();

      if (deposit) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        const currentBalance = profile?.balance || 0;
        const newBalance = parseFloat(currentBalance.toString()) + parseFloat(deposit.amount.toString());

        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', user.id);

        if (balanceError) {
          console.error('Error updating balance:', balanceError);
        } else {
          console.log(`Balance updated: ${currentBalance} -> ${newBalance}`);
        }
      }
    }

    return new Response(
      JSON.stringify(paymentStatus),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in nowpayments-check-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to check payment status. Please try again.' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

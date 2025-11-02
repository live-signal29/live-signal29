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
      throw new Error('NOWPAYMENTS_API_KEY not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { payment_id } = await req.json();

    if (!payment_id) {
      throw new Error('Missing payment_id');
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
      throw new Error(`NOWPayments API error: ${response.status}`);
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
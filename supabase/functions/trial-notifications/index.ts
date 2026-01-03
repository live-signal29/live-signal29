import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users with active free trials
    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, trial_end_date')
      .eq('subscription_status', 'free_trial')
      .not('trial_end_date', 'is', null);

    if (error) throw error;

    const now = new Date();
    const notifications = [];

    for (const profile of profiles || []) {
      const trialEndDate = new Date(profile.trial_end_date);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send notification on Day 3 (2 days remaining)
      if (daysRemaining === 2) {
        notifications.push({
          user_id: profile.id,
          email: profile.email,
          name: profile.full_name,
          message: "⏰ 2 days left in your free trial.",
          type: 'trial_reminder'
        });
      }

      // Send notification on Day 8 (trial expired)
      if (daysRemaining <= 0) {
        // Update subscription status to expired
        await supabaseClient
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', profile.id);

        notifications.push({
          user_id: profile.id,
          email: profile.email,
          name: profile.full_name,
          message: "🚀 Trial expired! Upgrade to keep receiving signals.",
          type: 'trial_expired'
        });
      }
    }

    console.log(`Processed ${notifications.length} trial notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications: notifications.length,
        details: notifications 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

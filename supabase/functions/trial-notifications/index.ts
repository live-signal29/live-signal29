import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY = 24 * 60 * 60 * 1000;

// Runs once a day (pg_cron). Sends in-app notifications along the trial journey:
//   2 days left -> last day -> expired -> +2 days (still thinking?) -> +7 days (one quick question)
// Each notification type is sent at most once per user per 30 days.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();

    // If an admin has a flash sale running, mention it in the messages.
    const { data: sale } = await supabaseClient
      .from('flash_sales')
      .select('title, discount_percent')
      .eq('active', true)
      .gt('ends_at', now.toISOString())
      .order('ends_at')
      .limit(1)
      .maybeSingle();
    const offer = sale ? ` ${sale.title}: ${sale.discount_percent}% OFF is live now.` : '';

    const notify = async (userId: string, type: string, title: string, message: string) => {
      const since = new Date(now.getTime() - 30 * DAY).toISOString();
      const { count } = await supabaseClient
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', type)
        .gte('created_at', since);
      if ((count ?? 0) > 0) return false;
      const { error } = await supabaseClient.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
      });
      return !error;
    };

    let reminders = 0;
    let lastDay = 0;
    let expired = 0;
    let winback2 = 0;
    let winback7 = 0;

    // ---- Users with an active free trial ----
    const { data: trialProfiles, error } = await supabaseClient
      .from('profiles')
      .select('id, trial_end_date')
      .eq('subscription_status', 'free_trial')
      .not('trial_end_date', 'is', null);

    if (error) throw error;

    for (const profile of trialProfiles || []) {
      const trialEndDate = new Date(profile.trial_end_date);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / DAY);

      // 2 days left
      if (daysRemaining === 2) {
        const ok = await notify(
          profile.id,
          'trial_reminder',
          '⏰ Trial ending soon',
          `2 days left in your free trial. Upgrade to keep instant access to every signal.${offer}`
        );
        if (ok) reminders++;
      }

      // Last day
      if (daysRemaining === 1) {
        const ok = await notify(
          profile.id,
          'trial_last_day',
          '⏳ Last day of your free trial',
          `Your free trial ends today. Upgrade now to keep instant access to all live signals.${offer}`
        );
        if (ok) lastDay++;
      }

      // Trial expired
      if (daysRemaining <= 0) {
        await supabaseClient
          .from('profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', profile.id);

        const ok = await notify(
          profile.id,
          'trial_expired',
          '🚀 Trial expired',
          `Your free trial has ended. Premium gives instant access to every signal, no waiting.${offer}`
        );
        if (ok) expired++;
      }
    }

    // ---- Users who never paid and whose trial ended 2 or 7 days ago ----
    const { data: expiredProfiles, error: expErr } = await supabaseClient
      .from('profiles')
      .select('id, trial_end_date, subscription_plan')
      .eq('subscription_status', 'expired')
      .not('trial_end_date', 'is', null)
      .gte('trial_end_date', new Date(now.getTime() - 9 * DAY).toISOString())
      .lt('trial_end_date', now.toISOString());

    if (expErr) throw expErr;

    for (const profile of expiredProfiles || []) {
      const plan = String(profile.subscription_plan || 'trial').toLowerCase();
      if (plan !== 'trial') continue; // someone who has paid before: skip

      const daysSince = Math.floor((now.getTime() - new Date(profile.trial_end_date).getTime()) / DAY);

      if (daysSince === 2) {
        const ok = await notify(
          profile.id,
          'trial_winback_2d',
          '🎁 Still thinking about Premium?',
          `Premium means instant, unlimited signals with no waiting.${offer} Tap to see the plans.`
        );
        if (ok) winback2++;
      }

      if (daysSince === 7) {
        const ok = await notify(
          profile.id,
          'trial_winback_7d',
          '💬 One quick question',
          'What is stopping you from going Premium? Open the Signals page and tell us in one tap. It helps us improve.'
        );
        if (ok) winback7++;
      }
    }

    console.log(`Trial notifications: ${reminders} reminders, ${lastDay} last-day, ${expired} expired, ${winback2} winback-2d, ${winback7} winback-7d`);

    // Never return user PII (this endpoint is callable without a JWT).
    return new Response(
      JSON.stringify({ success: true, reminders, lastDay, expired, winback2, winback7 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Unable to process trial notifications.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

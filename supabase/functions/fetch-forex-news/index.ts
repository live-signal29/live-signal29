import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ForexNewsEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
}

async function fetchForexCalendar(): Promise<ForexNewsEvent[]> {
  try {
    // Using ForexFactory calendar API alternative (free)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Using a public forex calendar API
    const response = await fetch(
      `https://nfs.faireconomy.media/ff_calendar_thisweek.json`,
      { headers: { "Accept": "application/json" } }
    );
    
    if (!response.ok) {
      console.log("Forex calendar API not available, returning empty");
      return [];
    }
    
    const data = await response.json();
    
    // Filter for high impact events only
    return data
      .filter((event: any) => event.impact === "High")
      .map((event: any) => ({
        title: event.title,
        country: event.country,
        date: event.date,
        time: event.time,
        impact: event.impact.toLowerCase(),
        forecast: event.forecast || "",
        previous: event.previous || "",
      }));
  } catch (error) {
    console.error("Error fetching forex calendar:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch forex news events
    const events = await fetchForexCalendar();
    
    if (events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No high-impact events found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Insert or update events in database
    for (const event of events) {
      const eventTime = new Date(`${event.date} ${event.time}`);
      
      // Check if event already exists
      const { data: existing } = await supabase
        .from("forex_news_alerts")
        .select("id")
        .eq("title", event.title)
        .eq("event_time", eventTime.toISOString())
        .maybeSingle();
      
      if (!existing) {
        await supabase.from("forex_news_alerts").insert({
          title: event.title,
          impact: event.impact,
          currency: event.country,
          event_time: eventTime.toISOString(),
          forecast: event.forecast,
          previous: event.previous,
        });
      }
    }
    
    // Check for events happening in next 15 minutes and send notifications
    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
    
    const { data: upcomingEvents } = await supabase
      .from("forex_news_alerts")
      .select("*")
      .eq("is_notified", false)
      .gte("event_time", now.toISOString())
      .lte("event_time", fifteenMinutesLater.toISOString());
    
    if (upcomingEvents && upcomingEvents.length > 0) {
      // Get all active users for notification
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .or("subscription_status.eq.premium,subscription_status.eq.free_trial");
      
      for (const event of upcomingEvents) {
        // Send notification to all users
        for (const user of users || []) {
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: `🗓 Upcoming News: ${event.currency}`,
            message: `${event.title} in 15 minutes. Impact: ${event.impact.toUpperCase()}`,
            type: "news_alert",
            metadata: { event_id: event.id, impact: event.impact },
          });
        }
        
        // Mark as notified
        await supabase
          .from("forex_news_alerts")
          .update({ is_notified: true })
          .eq("id", event.id);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsProcessed: events.length,
        notificationsSent: upcomingEvents?.length || 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in fetch-forex-news:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

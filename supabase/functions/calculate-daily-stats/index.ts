import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate stats for today
    const { data: trades } = await supabase
      .from("trade_history")
      .select("*")
      .gte("closed_at", `${todayStr}T00:00:00Z`)
      .lte("closed_at", `${todayStr}T23:59:59Z`);
    
    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({ message: "No trades to calculate for today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const totalSignals = trades.length;
    const totalWins = trades.filter(t => t.result === "win").length;
    const totalLosses = trades.filter(t => t.result === "loss").length;
    const totalBreakeven = trades.filter(t => t.result === "breakeven").length;
    const totalPips = trades.reduce((sum, t) => sum + (Number(t.pips_gained) || 0), 0);
    const winRate = totalSignals > 0 ? Math.round((totalWins / totalSignals) * 100 * 100) / 100 : 0;
    
    // Calculate top symbols
    const symbolCounts: Record<string, number> = {};
    trades.filter(t => t.result === "win").forEach(t => {
      symbolCounts[t.pair] = (symbolCounts[t.pair] || 0) + 1;
    });
    
    const topSymbols = Object.entries(symbolCounts)
      .map(([pair, wins]) => ({ pair, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 5);
    
    // Upsert daily stats
    const { error: upsertError } = await supabase
      .from("signal_stats")
      .upsert({
        stat_date: todayStr,
        total_signals: totalSignals,
        total_wins: totalWins,
        total_losses: totalLosses,
        total_breakeven: totalBreakeven,
        total_pips: totalPips,
        win_rate: winRate,
        top_symbols: topSymbols,
        updated_at: new Date().toISOString(),
      }, { onConflict: "stat_date" });
    
    if (upsertError) {
      throw upsertError;
    }
    
    // Also update admin_activity_log with daily summary
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    
    if (adminUsers && adminUsers.length > 0) {
      // Send notification to admins
      for (const admin of adminUsers) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "📊 Daily Summary Ready",
          message: `Today: ${totalWins}W/${totalLosses}L, Win Rate: ${winRate}%, Pips: ${totalPips > 0 ? '+' : ''}${totalPips}`,
          type: "daily_summary",
          metadata: {
            date: todayStr,
            wins: totalWins,
            losses: totalLosses,
            win_rate: winRate,
            pips: totalPips,
          },
        });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        stats: {
          date: todayStr,
          totalSignals,
          totalWins,
          totalLosses,
          totalBreakeven,
          totalPips,
          winRate,
          topSymbols,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calculate-daily-stats:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

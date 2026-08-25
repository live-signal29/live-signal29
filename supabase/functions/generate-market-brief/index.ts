import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const apiKey = Deno.env.get('LOVABLE_API_KEY');

    const prompt = `You are a professional forex market analyst. Generate a concise daily market brief for today covering:
1. Gold (XAU/USD) outlook
2. Major forex pairs sentiment (EUR/USD, GBP/USD, USD/JPY)
3. Crypto (BTC) key levels
4. Top 2 upcoming economic events to watch

Format in markdown. Keep it under 250 words. Also determine overall market sentiment: bullish, bearish, or neutral.
Respond with JSON: {"title": "...", "summary": "...markdown...", "sentiment": "bullish|bearish|neutral"}`;

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const { data, error } = await supabase.from('market_briefs').insert({
      title: parsed.title || `Market Brief — ${new Date().toDateString()}`,
      summary: parsed.summary || 'No content',
      sentiment: parsed.sentiment || 'neutral',
    }).select().single();

    if (error) throw error;
    return new Response(JSON.stringify({ success: true, brief: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

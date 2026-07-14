import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Minimal stub — logs code. Wire to Resend/SMTP later if desired.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const { email, code } = await req.json();
  console.log(`2FA code for ${email}: ${code}`);
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

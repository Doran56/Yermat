import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Signs in the App Store review demo account with a fixed code instead of a
// real emailed OTP (Guideline 2.1a — App Review can't receive mail). The code
// and email are only known here (Edge Function secrets), never in the client
// bundle. Mints a real session via admin.generateLink + verifyOtp so the
// reviewer lands on the exact same app as any other signed-in user.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();
    const expectedEmail = Deno.env.get('DEMO_REVIEWER_EMAIL');
    const expectedCode = Deno.env.get('DEMO_REVIEWER_OTP');

    if (!expectedEmail || !expectedCode) {
      console.error('[demo-review-login] missing DEMO_REVIEWER_EMAIL/DEMO_REVIEWER_OTP secrets');
      return new Response(
        JSON.stringify({ error: 'Not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      typeof email !== 'string' || typeof code !== 'string' ||
      email.trim().toLowerCase() !== expectedEmail.toLowerCase() ||
      code !== expectedCode
    ) {
      return new Response(
        JSON.stringify({ error: 'Code incorrect ou expiré.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: expectedEmail,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[demo-review-login] generateLink failed:', linkError);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });
    if (verifyError || !sessionData?.session) {
      console.error('[demo-review-login] verifyOtp failed:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[demo-review-login] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

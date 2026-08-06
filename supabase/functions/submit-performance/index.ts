import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      barId, challengeTypeId, videoUrl,
      videoStartMs, chugStartMs, chugEndMs, videoEndMs,
      visibility = 'public', isManual = false
    } = body;

    // Validate visibility
    const validVisibilities = ['public', 'followers', 'private'];
    if (!validVisibilities.includes(visibility)) {
      return new Response(
        JSON.stringify({ error: 'Invalid visibility value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!challengeTypeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: challengeTypeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoStatus = body.videoStatus || (isManual ? 'none' : 'uploading');

    if (chugStartMs === undefined || chugEndMs === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required timing fields: chugStartMs, chugEndMs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (chugStartMs >= chugEndMs) {
      return new Response(
        JSON.stringify({ error: 'Invalid timing: chug start must be before chug end' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const timeMs = chugEndMs - chugStartMs;

    if (timeMs < 500 || timeMs > 300000) {
      return new Response(
        JSON.stringify({ error: 'Invalid performance time: must be between 1 second and 5 minutes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch bar if provided
    let bar: { id: string; lat: number; lng: number; name: string } | null = null;
    if (barId) {
      const { data: barData, error: barError } = await supabase
        .from('bars')
        .select('id, lat, lng, name')
        .eq('id', barId)
        .eq('is_active', true)
        .single();

      if (barError || !barData) {
        return new Response(
          JSON.stringify({ error: 'Bar not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      bar = barData;
    }

    // Verify challenge type
    const { data: challengeType, error: challengeError } = await supabase
      .from('challenge_types')
      .select('id')
      .eq('id', challengeTypeId)
      .eq('is_active', true)
      .single();

    if (challengeError || !challengeType) {
      return new Response(
        JSON.stringify({ error: 'Challenge type not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const status = isManual ? 'unverified' : 'pending';

    const { data: performance, error: insertError } = await supabaseServiceRole
      .from('performances')
      .insert({
        bar_id: barId || null,
        challenge_type_id: challengeTypeId,
        time_ms: timeMs,
        video_url: videoUrl || null,
        user_id: user.id,
        status: status,
        video_status: videoStatus,
        video_start_ms: videoStartMs ?? 0,
        chug_start_ms: chugStartMs,
        chug_end_ms: chugEndMs,
        video_end_ms: videoEndMs ?? chugEndMs,
        visibility: visibility,
        user_lat: null,
        user_lng: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert performance:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save performance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Performance created: ${performance.id}, bar: ${barId}`);

    // ============ XP CALCULATION ============
    // Volontairement indépendant du temps/de la vitesse de consommation :
    // seule la participation (vidéo, nouveau lieu) est récompensée.
    let xpGained = 10;

    if (videoUrl && videoUrl.trim() !== '') {
      xpGained += 5;
    }

    if (barId) {
      const { count: previousPerfsInBar } = await supabaseServiceRole
        .from('performances')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('bar_id', barId)
        .neq('id', performance.id);

      if (previousPerfsInBar === 0) {
        xpGained += 20;
      }
    }

    // Update XP
    const { error: xpUpdateError } = await supabaseServiceRole.rpc('increment_user_xp', {
      p_user_id: user.id,
      p_xp_amount: xpGained
    }).maybeSingle();

    if (xpUpdateError) {
      const { data: currentProfile } = await supabaseServiceRole
        .from('profiles')
        .select('xp')
        .eq('user_id', user.id)
        .single();

      const currentXp = currentProfile?.xp || 0;
      await supabaseServiceRole
        .from('profiles')
        .update({ xp: currentXp + xpGained })
        .eq('user_id', user.id);
    }

    console.log(`XP: +${xpGained}`);

    // Fire-and-forget notifications
    const supabaseUrlForPush = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const notifHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    };

    fetch(`${supabaseUrlForPush}/functions/v1/notify-followers`, {
      method: 'POST',
      headers: notifHeaders,
      body: JSON.stringify({
        performanceId: performance.id,
        userId: user.id,
        barId: barId || null,
        visibility,
      }),
    }).catch(err => console.error('notify-followers error:', err));

    return new Response(
      JSON.stringify({ success: true, performance, xpGained }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

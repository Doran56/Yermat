import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!providedKey || providedKey !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey
    );

    const { performanceId, userId, barId, visibility } = await req.json();

    if (!performanceId || !userId) {
      return new Response(
        JSON.stringify({ error: 'performanceId and userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (visibility !== 'public') {
      return new Response(
        JSON.stringify({ message: 'Skipped: not public', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', userId)
      .single();

    const username = profile?.username || 'Quelqu\'un';

    let barName: string | null = null;
    if (barId) {
      const { data: bar } = await supabase
        .from('bars')
        .select('name')
        .eq('id', barId)
        .single();
      barName = bar?.name || null;
    }

    const usersToNotify = new Set<string>();

    const { data: userFollowers } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);

    userFollowers?.forEach(f => usersToNotify.add(f.follower_id));

    if (barId) {
      const { data: barFollowers } = await supabase
        .from('bar_follows')
        .select('user_id')
        .eq('bar_id', barId);

      barFollowers?.forEach(f => {
        if (f.user_id !== userId) usersToNotify.add(f.user_id);
      });
    }

    if (usersToNotify.size === 0) {
      return new Response(
        JSON.stringify({ message: 'No followers to notify', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Expo push tokens for all followers
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, expo_push_token')
      .in('user_id', Array.from(usersToNotify));

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const title = barName ? `Nouvelle perf au ${barName}` : 'Nouvelle performance';
    const body = `${username} a posté une nouvelle performance !`;

    const batchMessages = subscriptions.map((sub: { id: string; expo_push_token: string }) => ({
      expoPushToken: sub.expo_push_token,
      title,
      body,
      data: { performanceId, type: 'new_performance' },
    }));

    let sent = 0;
    let failed = 0;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(batchMessages),
      });

      if (response.ok) {
        const result = await response.json();
        const expiredTokens: string[] = result.expiredTokens ?? [];

        if (expiredTokens.length > 0) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .in('expo_push_token', expiredTokens);
          failed = expiredTokens.length;
        }

        sent = batchMessages.length - failed;
      } else {
        failed = batchMessages.length;
        console.error('[notify-followers] send-push batch failed:', await response.text());
      }
    } catch (err) {
      failed = batchMessages.length;
      console.error('[notify-followers] Batch error:', err);
    }

    console.log(`[notify-followers] Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notify-followers] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

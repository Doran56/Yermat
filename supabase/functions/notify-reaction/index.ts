import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotifType = 'comment' | 'yermat' | 'new_follower' | 'rank_beaten' | 'personal_best' | 'medal_earned';

const PUSH_TITLES: Record<NotifType, string> = {
  comment:       '💬 Commentaire',
  yermat:        '🍺 Yermat !',
  new_follower:  '👤 Nouvel abonné',
  rank_beaten:   '⚔️ Détrôné !',
  personal_best: '🎉 Record perso !',
  medal_earned:  '🏅 Médaille !',
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const providedKey = authHeader.replace('Bearer ', '');

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { type, performanceId, barId } = body as {
      type: NotifType;
      performanceId?: string;
      barId?: string;
      actorUserId?: string;
      targetUserId?: string;
    };

    let actorUserId: string;

    if (providedKey === serviceRoleKey) {
      actorUserId = body.actorUserId;
    } else {
      // Client call: verify JWT
      const clientSupabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await clientSupabase.auth.getUser();
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      actorUserId = user.id;
    }

    // Resolve recipient
    let recipientId: string | null = body.targetUserId ?? null;

    if (!recipientId && performanceId && (type === 'comment' || type === 'yermat')) {
      const { data: perf } = await adminSupabase
        .from('performances')
        .select('user_id')
        .eq('id', performanceId)
        .single();
      recipientId = perf?.user_id ?? null;
    }

    if (!recipientId) {
      return new Response(
        JSON.stringify({ error: 'Could not determine recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip self-notifications (except personal_best / medal_earned which target self)
    const isSelfNotif = type === 'personal_best' || type === 'medal_earned';
    if (!isSelfNotif && actorUserId === recipientId) {
      return new Response(
        JSON.stringify({ message: 'Skipped: self-notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert in-app notification
    await adminSupabase.from('notifications').insert({
      user_id: recipientId,
      type,
      performance_id: performanceId ?? null,
      source_user_id: actorUserId ?? null,
      source_bar_id: barId ?? null,
      read: false,
    });

    // Get actor username for push copy
    const { data: actorProfile } = await adminSupabase
      .from('profiles')
      .select('username')
      .eq('user_id', actorUserId)
      .single();
    const actorName = actorProfile?.username ?? 'Quelqu\'un';

    const pushBodies: Record<NotifType, string> = {
      comment:       `${actorName} a commenté ta perf`,
      yermat:        `${actorName} a yermaté ta perf 🍺`,
      new_follower:  `${actorName} commence à te suivre`,
      rank_beaten:   `${actorName} vient de te détrôner !`,
      personal_best: 'Nouveau record perso ! 🎉',
      medal_earned:  'Tu as gagné une médaille 🏅',
    };

    // Fetch push tokens of recipient
    const { data: subs } = await adminSupabase
      .from('push_subscriptions')
      .select('id, expo_push_token')
      .eq('user_id', recipientId);

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, pushed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messages = subs.map((sub: { id: string; expo_push_token: string }) => ({
      expoPushToken: sub.expo_push_token,
      title: PUSH_TITLES[type] ?? 'Yermat',
      body: pushBodies[type] ?? 'Nouvelle notification',
      data: {
        type,
        performanceId: performanceId ?? '',
        barId: barId ?? '',
      },
    }));

    const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(messages),
    });

    if (pushRes.ok) {
      const pushResult = await pushRes.json();
      const expiredTokens: string[] = pushResult.expiredTokens ?? [];
      if (expiredTokens.length > 0) {
        await adminSupabase
          .from('push_subscriptions')
          .delete()
          .in('expo_push_token', expiredTokens);
      }
    }

    return new Response(
      JSON.stringify({ success: true, pushed: subs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notify-reaction] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Supprime définitivement le compte de l'utilisateur courant et toutes ses données.
// Apple Guideline 5.1.1(v) — account deletion.
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Résoudre l'utilisateur depuis le JWT (jamais depuis le body).
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 2. Supprimer les vidéos du bucket `videos` AVANT toute suppression de ligne.
    //    Convention de nommage : {user_id}/...
    try {
      const { data: files } = await admin.storage.from('videos').list(userId, { limit: 1000 });
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await admin.storage.from('videos').remove(paths);
      }
    } catch (e) {
      console.error('[delete-account] storage cleanup failed (non-fatal):', e);
    }

    // 3. Supprimer explicitement les lignes des tables référençant user_id SANS FK cascade.
    await admin.from('performance_yermats').delete().eq('user_id', userId);
    await admin.from('performance_comments').delete().eq('user_id', userId);
    await admin.from('notifications').delete().eq('user_id', userId);
    await admin.from('notifications').delete().eq('source_user_id', userId);
    await admin.from('monthly_medals').delete().eq('user_id', userId);
    await admin.from('content_reports').delete().eq('reporter_id', userId);
    await admin.from('user_blocks').delete().eq('blocker_id', userId);
    await admin.from('user_blocks').delete().eq('blocked_id', userId);

    // 4. Supprimer l'utilisateur auth → cascade les FK (profiles, performances,
    //    user_follows, bar_follows, push_subscriptions, user_roles).
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-account] deleteUser failed:', deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[delete-account] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

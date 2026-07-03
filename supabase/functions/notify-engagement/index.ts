import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

// ============================================================
// notify-engagement — campagnes push PROACTIVES
//   campaign = 'winback' | 'weekend' | 'ranking'
// Déclenchée par pg_cron via trigger_engagement_campaign().
// Réutilise l'edge function send-push pour l'envoi batch + cleanup tokens.
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types proactifs (servent aussi au frequency cap)
const PROACTIVE_TYPES = [
  "winback_friends",
  "weekend_nudge",
  "ranking_urgency",
  "ranking_climbable",
] as const;
type ProactiveType = (typeof PROACTIVE_TYPES)[number];

const PUSH_TITLES: Record<ProactiveType, string> = {
  winback_friends: "👀 Ça chauffe sans toi",
  weekend_nudge: "🔥 Le week-end démarre",
  ranking_urgency: "⏳ Le classement va fermer",
  ranking_climbable: "⚔️ Le podium est jouable",
};

// Garde-fous (codés en dur, pas d'UI — décision produit)
const QUIET_START_HOUR = 22; // 22h Paris
const QUIET_END_HOUR = 9; //  9h Paris
const CAP_PER_DAY = 1;
const CAP_PER_WEEK = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Heure courante dans le fuseau Europe/Paris (0–23). */
function parisHour(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

interface Candidate {
  userId: string;
  type: ProactiveType;
  body: string;
  barId?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { campaign } = (await req.json().catch(() => ({}))) as { campaign?: string };
    if (!campaign || !["winback", "weekend", "ranking"].includes(campaign)) {
      return new Response(JSON.stringify({ error: "Invalid campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fenêtre de silence (sécurité — les jobs sont déjà calés en journée)
    const hour = parisHour();
    if (hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR) {
      return new Response(
        JSON.stringify({ skipped: "quiet_hours", parisHour: hour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Construire les candidats selon la campagne
    let candidates: Candidate[] = [];
    if (campaign === "winback") candidates = await buildWinback(supabase);
    else if (campaign === "weekend") candidates = await buildWeekend(supabase);
    else if (campaign === "ranking") candidates = await buildRanking(supabase);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ campaign, eligible: 0, pushed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Frequency cap : 1/jour, 3/semaine sur les types proactifs
    const candidateIds = [...new Set(candidates.map((c) => c.userId))];
    const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const { data: recent } = await supabase
      .from("notifications")
      .select("user_id, created_at")
      .in("user_id", candidateIds)
      .in("type", [...PROACTIVE_TYPES])
      .gte("created_at", weekAgo);

    const dayAgoMs = Date.now() - DAY_MS;
    const dayCount = new Map<string, number>();
    const weekCount = new Map<string, number>();
    for (const r of recent ?? []) {
      weekCount.set(r.user_id, (weekCount.get(r.user_id) ?? 0) + 1);
      if (new Date(r.created_at).getTime() >= dayAgoMs) {
        dayCount.set(r.user_id, (dayCount.get(r.user_id) ?? 0) + 1);
      }
    }

    // Un seul message par user par run + respect du cap
    const seen = new Set<string>();
    const toSend = candidates.filter((c) => {
      if (seen.has(c.userId)) return false;
      if ((dayCount.get(c.userId) ?? 0) >= CAP_PER_DAY) return false;
      if ((weekCount.get(c.userId) ?? 0) >= CAP_PER_WEEK) return false;
      seen.add(c.userId);
      return true;
    });

    if (toSend.length === 0) {
      return new Response(
        JSON.stringify({ campaign, eligible: candidateIds.length, capped: true, pushed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Insérer les notifications in-app (avec pushed_at pour l'analytics)
    const nowIso = new Date().toISOString();
    const rows = toSend.map((c) => ({
      user_id: c.userId,
      type: c.type,
      source_bar_id: c.barId ?? null,
      read: false,
      pushed_at: nowIso,
    }));
    const { data: inserted, error: insertErr } = await supabase
      .from("notifications")
      .insert(rows)
      .select("id, user_id, type, source_bar_id");
    if (insertErr) throw insertErr;

    // 4. Récupérer les tokens push des destinataires
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id, expo_push_token")
      .in("user_id", toSend.map((c) => c.userId));

    const tokensByUser = new Map<string, string[]>();
    for (const s of subs ?? []) {
      const arr = tokensByUser.get(s.user_id) ?? [];
      arr.push(s.expo_push_token);
      tokensByUser.set(s.user_id, arr);
    }

    // 5. Construire les messages Expo (notificationId => stamp opened_at au tap)
    const bodyByUser = new Map(toSend.map((c) => [c.userId, c]));
    const messages: Array<Record<string, unknown>> = [];
    for (const notif of inserted ?? []) {
      const c = bodyByUser.get(notif.user_id);
      const tokens = tokensByUser.get(notif.user_id);
      if (!c || !tokens) continue;
      for (const token of tokens) {
        messages.push({
          expoPushToken: token,
          title: PUSH_TITLES[notif.type as ProactiveType] ?? "Yermat",
          body: c.body,
          data: {
            type: notif.type,
            notificationId: notif.id,
            barId: notif.source_bar_id ?? "",
          },
        });
      }
    }

    let pushed = 0;
    if (messages.length > 0) {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(messages),
      });
      if (res.ok) {
        const result = await res.json();
        const expired: string[] = result.expiredTokens ?? [];
        if (expired.length > 0) {
          await supabase.from("push_subscriptions").delete().in("expo_push_token", expired);
        }
        pushed = messages.length - expired.length;
      } else {
        console.error("[notify-engagement] send-push failed:", await res.text());
      }
    }

    console.log(`[notify-engagement] campaign=${campaign} notifs=${rows.length} pushed=${pushed}`);
    return new Response(
      JSON.stringify({ campaign, eligible: candidateIds.length, notified: rows.length, pushed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-engagement] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================
// Campagnes
// ============================================================

type SupabaseClient = ReturnType<typeof createClient>;

async function buildWinback(supabase: SupabaseClient): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - 5 * DAY_MS);
  const { data: dormant } = await supabase
    .from("profiles")
    .select("user_id, last_active_at")
    .lt("last_active_at", cutoff.toISOString());
  if (!dormant || dormant.length === 0) return [];

  const dormantIds = dormant.map((p) => p.user_id);
  const lastActiveByUser = new Map(dormant.map((p) => [p.user_id, p.last_active_at as string]));

  const { data: follows } = await supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .in("follower_id", dormantIds);
  if (!follows || follows.length === 0) return [];

  const followingsByUser = new Map<string, string[]>();
  for (const f of follows) {
    const arr = followingsByUser.get(f.follower_id) ?? [];
    arr.push(f.following_id);
    followingsByUser.set(f.follower_id, arr);
  }

  const since = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const { data: perfs } = await supabase
    .from("performances")
    .select("user_id, created_at")
    .eq("status", "approved")
    .eq("visibility", "public")
    .gte("created_at", since);
  if (!perfs || perfs.length === 0) return [];

  const candidates: Candidate[] = [];
  for (const userId of dormantIds) {
    const followings = new Set(followingsByUser.get(userId) ?? []);
    if (followings.size === 0) continue;
    const lastActive = new Date(lastActiveByUser.get(userId) ?? 0).getTime();
    const n = perfs.filter(
      (p) => followings.has(p.user_id) && new Date(p.created_at).getTime() > lastActive
    ).length;
    if (n < 1) continue;
    const body =
      n === 1
        ? "Un de tes potes a yermaté depuis ta dernière visite 👀"
        : `${n} perfs de tes potes depuis ta dernière visite 👀`;
    candidates.push({ userId, type: "winback_friends", body });
  }
  return candidates;
}

async function buildWeekend(supabase: SupabaseClient): Promise<Candidate[]> {
  const activeSince = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const { data: active } = await supabase
    .from("profiles")
    .select("user_id")
    .gte("last_active_at", activeSince);
  if (!active || active.length === 0) return [];
  const activeIds = active.map((p) => p.user_id);

  const dayStart = new Date(Date.now() - DAY_MS).toISOString();
  const { data: postedToday } = await supabase
    .from("performances")
    .select("user_id")
    .in("user_id", activeIds)
    .gte("created_at", dayStart);
  const postedSet = new Set((postedToday ?? []).map((p) => p.user_id));

  const recentSince = new Date(Date.now() - DAY_MS).toISOString();
  const { data: recentPerfs } = await supabase
    .from("performances")
    .select("user_id, bar_id, created_at, profiles!performances_user_id_profiles_fkey(username), bars(name)")
    .eq("status", "approved")
    .eq("visibility", "public")
    .gte("created_at", recentSince)
    .order("created_at", { ascending: false });

  const { data: follows } = await supabase
    .from("user_follows")
    .select("follower_id, following_id")
    .in("follower_id", activeIds);
  const followingsByUser = new Map<string, string[]>();
  for (const f of follows ?? []) {
    const arr = followingsByUser.get(f.follower_id) ?? [];
    arr.push(f.following_id);
    followingsByUser.set(f.follower_id, arr);
  }
  const lastPerfByAuthor = new Map<string, { username?: string; barName?: string }>();
  for (const p of recentPerfs ?? []) {
    if (!lastPerfByAuthor.has(p.user_id)) {
      lastPerfByAuthor.set(p.user_id, {
        username: (p as any).profiles?.username,
        barName: (p as any).bars?.name,
      });
    }
  }

  const candidates: Candidate[] = [];
  for (const userId of activeIds) {
    if (postedSet.has(userId)) continue;
    let body = "Tes potes sont chauds ce soir — à toi de jouer 🍻";
    const followings = followingsByUser.get(userId) ?? [];
    for (const f of followings) {
      const perf = lastPerfByAuthor.get(f);
      if (perf?.username) {
        body = perf.barName
          ? `${perf.username} vient de poster au ${perf.barName} 🔥`
          : `${perf.username} vient de poster 🔥`;
        break;
      }
    }
    candidates.push({ userId, type: "weekend_nudge", body });
  }
  return candidates;
}

async function buildRanking(supabase: SupabaseClient): Promise<Candidate[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilEnd = Math.ceil((nextMonth.getTime() - now.getTime()) / DAY_MS);

  const { data: perfs } = await supabase
    .from("performances")
    .select("user_id, time_ms")
    .eq("status", "approved")
    .eq("visibility", "public")
    .gte("created_at", monthStart);
  if (!perfs || perfs.length === 0) return [];

  const best = new Map<string, number>();
  for (const p of perfs) {
    const cur = best.get(p.user_id);
    if (cur === undefined || p.time_ms < cur) best.set(p.user_id, p.time_ms);
  }
  const ranking = [...best.entries()]
    .map(([userId, time_ms]) => ({ userId, time_ms }))
    .sort((a, b) => a.time_ms - b.time_ms);
  if (ranking.length === 0) return [];

  const top1 = ranking[0].time_ms;
  const CLOSE_GAP_MS = 1500;
  const candidates: Candidate[] = [];

  for (let i = 0; i < ranking.length; i++) {
    const rank = i + 1;
    const { userId, time_ms } = ranking[i];

    if (daysUntilEnd <= 2 && rank <= 5) {
      const body =
        rank === 1
          ? "Plus que 48h — défends ta 1re place du mois 👑"
          : `Plus que 48h — t'es ${rank}e au classement, le podium est jouable`;
      candidates.push({ userId, type: "ranking_urgency", body });
    } else if ((rank === 2 || rank === 3) && time_ms - top1 <= CLOSE_GAP_MS) {
      candidates.push({
        userId,
        type: "ranking_climbable",
        body: `Tu es ${rank}e — il s'en faut de peu pour passer 1er`,
      });
    }
  }
  return candidates;
}

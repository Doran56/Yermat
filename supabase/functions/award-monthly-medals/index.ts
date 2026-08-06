import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Accept optional "month" param (YYYY-MM format) to award a specific month
  let targetMonth: Date;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.month) {
      const [y, m] = body.month.split("-").map(Number);
      targetMonth = new Date(y, m - 1, 1);
    } else {
      // Default: previous month
      const now = new Date();
      targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }
  } catch {
    const now = new Date();
    targetMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  const monthStart = targetMonth.toISOString();
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1).toISOString();
  const monthDate = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}-01`;

  try {
    // Fetch all approved public performances for the previous month
    const { data: performances, error: perfError } = await supabase
      .from("performances")
      .select("id, user_id, bar_id, challenge_type_id")
      .eq("status", "approved")
      .eq("visibility", "public")
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    if (perfError) throw perfError;
    if (!performances || performances.length === 0) {
      return new Response(JSON.stringify({ message: "No performances for previous month" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Médailles basées sur la participation (nombre de Yermats publiés), jamais
    // sur la vitesse/quantité consommée — voir Guideline 5 (Legal) d'Apple.
    // Helper: classe les utilisateurs par nombre de publications décroissant
    function getTop3(perfs: typeof performances): { user_id: string; count: number }[] {
      const counts = new Map<string, number>();
      for (const p of perfs) {
        counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    }

    const medals: Array<{
      user_id: string;
      month: string;
      rank: number;
      category: string;
      challenge_type_id: string | null;
      bar_id: string | null;
      time_ms: number;
    }> = [];

    function addMedals(
      top3: { user_id: string; count: number }[],
      category: string,
      challengeTypeId: string | null = null,
      barId: string | null = null
    ) {
      top3.forEach((entry, i) => {
        medals.push({
          user_id: entry.user_id,
          month: monthDate,
          rank: i + 1,
          category,
          challenge_type_id: challengeTypeId,
          bar_id: barId,
          time_ms: 0, // non pertinent : la médaille récompense la participation, pas la vitesse
        });
      });
    }

    // 1. General (le plus actif du mois)
    addMedals(getTop3(performances), "general");

    // 2. By challenge type (le plus actif sur ce format)
    const challengeIds = [...new Set(performances.map((p) => p.challenge_type_id))];
    for (const ctId of challengeIds) {
      const ctPerfs = performances.filter((p) => p.challenge_type_id === ctId);
      addMedals(getTop3(ctPerfs), `challenge_${ctId}`, ctId, null);
    }

    // 3. By bar (le plus actif dans ce lieu)
    const barIds = [...new Set(performances.map((p) => p.bar_id).filter(Boolean))] as string[];
    for (const barId of barIds) {
      const barPerfs = performances.filter((p) => p.bar_id === barId);
      addMedals(getTop3(barPerfs), `bar_${barId}`, null, barId);
    }

    // Insert all medals (idempotent)
    if (medals.length > 0) {
      const { error: insertError } = await supabase
        .from("monthly_medals")
        .upsert(medals, { onConflict: "user_id,month,category", ignoreDuplicates: true });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ message: `Awarded ${medals.length} medals for ${monthDate}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

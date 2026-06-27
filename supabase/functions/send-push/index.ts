import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const payload = await req.json();

    // Accept single message or array of messages
    type MsgInput = { expoPushToken: string; title?: string; body?: string; data?: Record<string, unknown> };
    const inputs: MsgInput[] = Array.isArray(payload) ? payload : [payload];

    if (inputs.some(m => !m.expoPushToken)) {
      return new Response(
        JSON.stringify({ error: 'Missing expoPushToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messages = inputs.map(m => ({
      to: m.expoPushToken,
      sound: 'default',
      title: m.title || 'Yermat',
      body: m.body || 'Nouvelle notification',
      data: m.data || {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    const result = await response.json();

    // Normalize to array of tickets
    const tickets: Array<{ status: string; details?: { error?: string } }> =
      Array.isArray(result.data) ? result.data : [result.data];

    const expiredTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
        expiredTokens.push(inputs[i].expoPushToken);
      }
    });

    const hasOtherError = tickets.some(
      t => t?.status === 'error' && t?.details?.error !== 'DeviceNotRegistered'
    );
    if (hasOtherError) {
      console.error('[send-push] Expo errors:', tickets.filter(t => t?.status === 'error'));
    }

    return new Response(
      JSON.stringify({ success: true, expiredTokens }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

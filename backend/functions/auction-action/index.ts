import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, playerId, seconds, stage } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    let result: any = null;

    switch (action) {
      case 'start':
        if (!playerId) throw new Error('Player ID required to start auction lot');
        result = await supabase.rpc('fn_start_auction', { p_player_id: Number(playerId) });
        break;

      case 'sell':
        result = await supabase.rpc('fn_sell_player');
        break;

      case 'unsold':
        result = await supabase.rpc('fn_unsold_player');
        break;

      case 'pause':
        result = await supabase.rpc('fn_pause_auction');
        break;

      case 'resume':
        result = await supabase.rpc('fn_resume_auction');
        break;

      case 'reset':
        result = await supabase.rpc('fn_reset_auction');
        break;

      case 'timer':
        result = await supabase.rpc('fn_add_timer', { p_seconds: Number(seconds || 10) });
        break;

      case 'gavel':
        result = await supabase.rpc('fn_set_gavel', { p_stage: Number(stage || 1) });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown auction action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result.data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

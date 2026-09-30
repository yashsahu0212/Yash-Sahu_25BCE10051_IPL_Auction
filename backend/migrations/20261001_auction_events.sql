-- =====================================================================
-- HAMMER — AUCTION EVENTS & ACTIVITY LOG MIGRATION
-- =====================================================================
-- Creates persistent authoritative auction_events table, RLS policies,
-- sequence tracking, and Supabase Realtime publication setup.
-- =====================================================================

-- 1. AUCTION EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.auction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id INT NOT NULL DEFAULT 1 REFERENCES public.auctions(id),
    lot_id INT,
    player_id INT REFERENCES public.players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'AUCTION_STARTED',
        'AUCTION_PAUSED',
        'AUCTION_RESUMED',
        'AUCTION_ENDED',
        'AUCTION_RESET',
        'LOT_OPENED',
        'LOT_STARTED',
        'LOT_TIMER_RESET',
        'LOT_PAUSED',
        'LOT_RESUMED',
        'LOT_SOLD',
        'LOT_UNSOLD',
        'BID_PLACED',
        'BID_REJECTED',
        'PLAYER_SELECTED',
        'NEXT_PLAYER',
        'UPCOMING_PLAYER_CHANGED',
        'TIMER_CHANGED',
        'TEAM_SQUAD_UPDATED',
        'PLAYER_ASSIGNED'
    )),
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    actor_role TEXT,
    amount_lakh INT DEFAULT 0,
    previous_amount_lakh INT DEFAULT 0,
    event_sequence BIGINT GENERATED ALWAYS AS IDENTITY,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. INDEXES FOR HIGH-PERFORMANCE REALTIME QUERIES
CREATE INDEX IF NOT EXISTS idx_auction_events_seq ON public.auction_events(event_sequence DESC);
CREATE INDEX IF NOT EXISTS idx_auction_events_auction_lot ON public.auction_events(auction_id, lot_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_player ON public.auction_events(player_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_created ON public.auction_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_events_type ON public.auction_events(event_type);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (Public read for tournament transparency, server-only inserts via service role / functions)
DROP POLICY IF EXISTS "Allow public read auction_events" ON public.auction_events;
CREATE POLICY "Allow public read auction_events" ON public.auction_events FOR SELECT USING (true);

-- 5. FUNCTION TO LOG AUTHORITATIVE AUCTION EVENT
CREATE OR REPLACE FUNCTION public.fn_log_auction_event(
    p_event_type TEXT,
    p_player_id INT DEFAULT NULL,
    p_lot_id INT DEFAULT NULL,
    p_actor_team_id TEXT DEFAULT NULL,
    p_amount_lakh INT DEFAULT 0,
    p_prev_amount_lakh INT DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID;
    v_user_role TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;
    END IF;

    INSERT INTO public.auction_events (
        auction_id,
        lot_id,
        player_id,
        event_type,
        actor_user_id,
        actor_team_id,
        actor_role,
        amount_lakh,
        previous_amount_lakh,
        metadata
    ) VALUES (
        1,
        p_lot_id,
        p_player_id,
        p_event_type,
        v_user_id,
        p_actor_team_id,
        COALESCE(v_user_role, 'system'),
        p_amount_lakh,
        p_prev_amount_lakh,
        p_metadata
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- 6. ADD TO SUPABASE REALTIME REPLICATION (For instant broadcast)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_events;
        EXCEPTION
            WHEN duplicate_object THEN
                -- Already added
                NULL;
        END;
    END IF;
END $$;

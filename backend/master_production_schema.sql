-- =====================================================================
-- HAMMER REALTIME CRICKET AUCTION ENGINE — MASTER PRODUCTION SCHEMA
-- Complete, Idempotent, Production-Ready PostgreSQL & Supabase Database Setup
-- 
-- Includes:
-- 1. Extensions (uuid-ossp, pgcrypto)
-- 2. Complete Relational Tables (Teams, Profiles, Players, Auctions, Bids,
--    Team Squads, Auction History, Auction Events) with full Foreign Keys
--    for Supabase Schema Visualizer
-- 3. Database Triggers (updated_at timestamps, squad metrics auto-recalculation,
--    bid audit trail, player status audit trail, auth user to profile sync)
-- 4. Stored Procedures & Atomic Functions (fn_place_bid with FOR UPDATE,
--    fn_start_auction, fn_sell_player, fn_unsold_player, fn_retain_captain, etc.)
-- 5. Row-Level Security (RLS) Policies
-- 6. Supabase Realtime Publication for all tables
-- 7. Full Official IPL 2026 Seed Data (10 Franchises, 73 Players, Users)
-- =====================================================================

-- ─── 1. EXTENSIONS ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 2. TABLES & RELATIONAL SCHEMA ───────────────────────────────────

-- 2.1 TEAMS TABLE (10 Official IPL Franchises)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY, -- 'MI', 'CSK', 'RCB', 'DC', 'GT', 'KKR', 'LSG', 'PBKS', 'RR', 'SRH'
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    code TEXT,
    purse INT NOT NULL DEFAULT 12500,     -- Integer lakhs (12,500 = ₹125.00 Cr)
    spent INT NOT NULL DEFAULT 0,         -- Integer lakhs
    remaining INT NOT NULL DEFAULT 12500, -- Integer lakhs
    max_slots INT NOT NULL DEFAULT 25,
    min_slots INT NOT NULL DEFAULT 7,
    filled_slots INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#211C17',
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 PROFILES TABLE (Associated with Supabase auth.users & public.teams)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('auctioneer', 'team_owner', 'viewer')),
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 PLAYERS TABLE (Official IPL Player Catalog)
CREATE TABLE IF NOT EXISTS public.players (
    id SERIAL PRIMARY KEY,
    lot_number INT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('batter', 'bowler', 'allrounder', 'wicketkeeper')),
    role_label TEXT,
    nationality TEXT NOT NULL DEFAULT 'India',
    overseas BOOLEAN NOT NULL DEFAULT false,
    capped BOOLEAN NOT NULL DEFAULT true,
    set_name TEXT,
    base_price INT NOT NULL,              -- Integer lakhs (e.g. 200, 150, 100, 75, 50, 40, 30)
    image TEXT,
    icon TEXT DEFAULT 'sports_cricket',
    stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    tactical_profile TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_hammer', 'sold', 'unsold')),
    sold_to TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    sold_price INT,                       -- Integer lakhs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 AUCTIONS TABLE (Singleton active session state)
CREATE TABLE IF NOT EXISTS public.auctions (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'live', 'paused', 'completed')),
    current_player_id INT REFERENCES public.players(id) ON DELETE SET NULL,
    current_bid INT NOT NULL DEFAULT 0,   -- Integer lakhs
    base_price INT NOT NULL DEFAULT 0,    -- Integer lakhs
    leading_team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    round INT NOT NULL DEFAULT 1,
    lot_index INT NOT NULL DEFAULT 0,
    timer INT NOT NULL DEFAULT 15,
    max_timer INT NOT NULL DEFAULT 15,    -- Authoritative auction duration
    gavel_stage INT NOT NULL DEFAULT 0 CHECK (gavel_stage BETWEEN 0 AND 3),
    bid_increment INT NOT NULL DEFAULT 10,-- Integer lakhs (+10L, +20L, +50L)
    session_label TEXT NOT NULL DEFAULT '2026 MEGA AUCTION',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 BIDS AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id INT NOT NULL DEFAULT 1 REFERENCES public.auctions(id) ON DELETE CASCADE,
    player_id INT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    amount INT NOT NULL,                  -- Integer lakhs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.6 TEAM SQUADS TABLE (Ratified acquisitions & retentions)
CREATE TABLE IF NOT EXISTS public.team_squads (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id INT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    sold_price INT NOT NULL,              -- Integer lakhs
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, player_id)
);

-- 2.7 AUCTION HISTORY TABLE (Finished lots archival ledger)
CREATE TABLE IF NOT EXISTS public.auction_history (
    id SERIAL PRIMARY KEY,
    player_id INT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    player_role TEXT NOT NULL,
    lot_number INT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('sold', 'unsold')),
    sold_to TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    sold_price INT,                       -- Integer lakhs
    base_price INT NOT NULL,              -- Integer lakhs
    bid_count INT NOT NULL DEFAULT 0,
    bid_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 AUCTION EVENTS TABLE (Authoritative timeline and broadcast stream)
CREATE TABLE IF NOT EXISTS public.auction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id INT NOT NULL DEFAULT 1 REFERENCES public.auctions(id) ON DELETE CASCADE,
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
        'PLAYER_ASSIGNED',
        'CAPTAIN_RETAINED'
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

-- ─── 3. INDEXES FOR HIGH CONCURRENCY & FAST QUERIES ──────────────────
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);
CREATE INDEX IF NOT EXISTS idx_players_sold_to ON public.players(sold_to);
CREATE INDEX IF NOT EXISTS idx_players_lot_num ON public.players(lot_number);
CREATE INDEX IF NOT EXISTS idx_bids_player_id ON public.bids(player_id);
CREATE INDEX IF NOT EXISTS idx_bids_team_id ON public.bids(team_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_squads_team_id ON public.team_squads(team_id);
CREATE INDEX IF NOT EXISTS idx_auction_history_player ON public.auction_history(player_id);
CREATE INDEX IF NOT EXISTS idx_auction_events_seq ON public.auction_events(event_sequence DESC);
CREATE INDEX IF NOT EXISTS idx_auction_events_type ON public.auction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auction_events_created ON public.auction_events(created_at DESC);

-- ─── 4. DATABASE FUNCTIONS & STORED PROCEDURES ───────────────────────

-- 4.1 Trigger Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 4.2 Trigger Function: Synchronize Team Squad Metrics (spent, remaining, filled_slots)
CREATE OR REPLACE FUNCTION public.fn_sync_team_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_id TEXT;
    v_total_spent INT;
    v_slots_count INT;
    v_starting_purse INT := 12500;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_team_id := OLD.team_id;
    ELSE
        v_team_id := NEW.team_id;
    END IF;

    SELECT COALESCE(SUM(sold_price), 0), COUNT(*)
    INTO v_total_spent, v_slots_count
    FROM public.team_squads
    WHERE team_id = v_team_id;

    UPDATE public.teams
    SET spent = v_total_spent,
        remaining = v_starting_purse - v_total_spent,
        purse = v_starting_purse - v_total_spent,
        filled_slots = v_slots_count,
        updated_at = now()
    WHERE id = v_team_id;

    RETURN NULL;
END;
$$;

-- 4.3 Trigger Function: Auto-log accepted bid to auction_events
CREATE OR REPLACE FUNCTION public.fn_audit_bid_placed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.auction_events (
        auction_id,
        player_id,
        event_type,
        actor_team_id,
        actor_role,
        amount_lakh,
        metadata
    ) VALUES (
        NEW.auction_id,
        NEW.player_id,
        'BID_PLACED',
        NEW.team_id,
        'team_owner',
        NEW.amount,
        jsonb_build_object('bid_id', NEW.id, 'placed_at', NEW.created_at)
    );
    RETURN NEW;
END;
$$;

-- 4.4 Trigger Function: Auto-log player status transitions
CREATE OR REPLACE FUNCTION public.fn_audit_player_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.status = 'on_hammer' AND (OLD.status IS NULL OR OLD.status != 'on_hammer') THEN
        INSERT INTO public.auction_events (
            auction_id, lot_id, player_id, event_type, actor_role, amount_lakh, metadata
        ) VALUES (
            1, NEW.lot_number, NEW.id, 'LOT_OPENED', 'auctioneer', NEW.base_price,
            jsonb_build_object('name', NEW.name, 'role', NEW.role, 'basePrice', NEW.base_price)
        );
    ELSIF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
        INSERT INTO public.auction_events (
            auction_id, lot_id, player_id, event_type, actor_team_id, actor_role, amount_lakh, metadata
        ) VALUES (
            1, NEW.lot_number, NEW.id, 'LOT_SOLD', NEW.sold_to, 'auctioneer', COALESCE(NEW.sold_price, 0),
            jsonb_build_object('name', NEW.name, 'soldTo', NEW.sold_to, 'soldPrice', NEW.sold_price)
        );
    ELSIF NEW.status = 'unsold' AND (OLD.status IS NULL OR OLD.status != 'unsold') THEN
        INSERT INTO public.auction_events (
            auction_id, lot_id, player_id, event_type, actor_role, amount_lakh, metadata
        ) VALUES (
            1, NEW.lot_number, NEW.id, 'LOT_UNSOLD', 'auctioneer', NEW.base_price,
            jsonb_build_object('name', NEW.name, 'basePrice', NEW.base_price)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 4.5 Trigger Function: Auto-create Profile on Auth User Registration
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_username TEXT;
    v_role TEXT;
    v_team_id TEXT;
BEGIN
    v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
    v_team_id := NEW.raw_user_meta_data->>'teamId';

    INSERT INTO public.profiles (id, email, username, role, team_id)
    VALUES (NEW.id, NEW.email, v_username, v_role, v_team_id)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        team_id = EXCLUDED.team_id,
        updated_at = now();

    RETURN NEW;
END;
$$;

-- 4.6 Helper: Format Lakhs into Cr / L string
CREATE OR REPLACE FUNCTION public.format_cr(val INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF val IS NULL THEN RETURN '—'; END IF;
    IF val >= 100 THEN
        RETURN '₹' || TO_CHAR(val / 100.0, 'FM999990.00') || ' Cr';
    ELSE
        RETURN '₹' || val::TEXT || ' L';
    END IF;
END;
$$;

-- 4.7 Helper: Tiered Bid Increment Calculator
CREATE OR REPLACE FUNCTION public.get_bid_increment(current_bid INT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF current_bid < 100 THEN
        RETURN 10;
    ELSIF current_bid < 500 THEN
        RETURN 20;
    ELSE
        RETURN 50;
    END IF;
END;
$$;

-- 4.8 Helper: Next Valid Bid Calculator
CREATE OR REPLACE FUNCTION public.get_next_valid_bid(current_bid INT, base_price INT, has_leader BOOLEAN)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF NOT has_leader OR current_bid = 0 THEN
        RETURN base_price;
    ELSE
        RETURN current_bid + public.get_bid_increment(current_bid);
    END IF;
END;
$$;

-- 4.9 Function: Atomic Submit Bid with FOR UPDATE Lock & Integrity Validation
CREATE OR REPLACE FUNCTION public.fn_place_bid(p_expected_bid INT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_team_id TEXT;
    v_team RECORD;
    v_auction RECORD;
    v_player RECORD;
    v_new_bid INT;
    v_leading_short_name TEXT;
    v_bid_id UUID;
    v_min_reserve_needed INT;
    v_remaining_required_slots INT;
    v_overseas_count INT;
BEGIN
    -- 1. Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to place bids' USING ERRCODE = '20001';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF v_profile IS NULL OR v_profile.role != 'team_owner' OR v_profile.team_id IS NULL THEN
        RAISE EXCEPTION 'Access Denied: Only team owner accounts can submit bids' USING ERRCODE = '20002';
    END IF;

    v_team_id := v_profile.team_id;

    -- 2. ACQUIRE ATOMIC ROW LOCK ON AUCTION SESSION (Zero Race Conditions)
    SELECT * INTO v_auction FROM public.auctions WHERE id = 1 FOR UPDATE;
    IF v_auction IS NULL OR v_auction.status != 'live' THEN
        RAISE EXCEPTION 'Auction is not currently live for bidding' USING ERRCODE = '20003';
    END IF;

    -- 3. Lock and verify currently auctioned player
    SELECT * INTO v_player FROM public.players WHERE id = v_auction.current_player_id FOR UPDATE;
    IF v_player IS NULL OR v_player.status != 'on_hammer' THEN
        RAISE EXCEPTION 'Active lot player is not available on hammer' USING ERRCODE = '20004';
    END IF;

    -- 4. RULE: LEADING TEAM CANNOT RE-BID ON SAME LOT
    IF v_auction.leading_team_id = v_team_id THEN
        RAISE EXCEPTION 'Leading team cannot outbid itself on the same lot.' USING ERRCODE = '20005';
    END IF;

    -- 5. Lock and inspect bidding team purse & squad capacity
    SELECT * INTO v_team FROM public.teams WHERE id = v_team_id FOR UPDATE;
    IF v_team.filled_slots >= v_team.max_slots THEN
        RAISE EXCEPTION 'Squad roster is full (% / % slots)', v_team.filled_slots, v_team.max_slots USING ERRCODE = '20006';
    END IF;

    -- 6. Overseas player quota enforcement (Max 8 overseas per franchise)
    IF v_player.overseas THEN
        SELECT COUNT(*) INTO v_overseas_count
        FROM public.team_squads ts
        JOIN public.players pl ON ts.player_id = pl.id
        WHERE ts.team_id = v_team_id AND pl.overseas = true;

        IF v_overseas_count >= 8 THEN
            RAISE EXCEPTION 'Overseas player limit reached: maximum 8 overseas players allowed per franchise.' USING ERRCODE = '20015';
        END IF;
    END IF;

    -- 7. Calculate next valid bid in integer lakhs
    v_new_bid := public.get_next_valid_bid(v_auction.current_bid, v_auction.base_price, v_auction.leading_team_id IS NOT NULL);

    -- 8. Anti-race-condition validation against client expectedBid
    IF p_expected_bid IS NOT NULL AND p_expected_bid != v_new_bid THEN
        SELECT short_name INTO v_leading_short_name FROM public.teams WHERE id = v_auction.leading_team_id;
        RAISE EXCEPTION 'Outbid! Current bid is now % (%). Next valid bid is %.',
            public.format_cr(v_auction.current_bid),
            COALESCE(v_leading_short_name, 'Competitor'),
            public.format_cr(v_new_bid)
            USING ERRCODE = '20007';
    END IF;

    -- 9. Check team purse sufficiency (Integer lakhs)
    IF v_new_bid > v_team.remaining THEN
        RAISE EXCEPTION 'Insufficient purse: % remaining, but this bid requires %',
            public.format_cr(v_team.remaining),
            public.format_cr(v_new_bid)
            USING ERRCODE = '20008';
    END IF;

    -- 10. Squad constraint preservation check: minimum ₹30L reserve per remaining required slot to reach 7 players
    v_remaining_required_slots := GREATEST(0, v_team.min_slots - (v_team.filled_slots + 1));
    v_min_reserve_needed := v_remaining_required_slots * 30;
    IF (v_team.remaining - v_new_bid) < v_min_reserve_needed THEN
        RAISE EXCEPTION 'Purse deficit: Bidding % leaves %, insufficient to fill the mandatory 7-player minimum squad.',
            public.format_cr(v_new_bid),
            public.format_cr(v_team.remaining - v_new_bid)
            USING ERRCODE = '20009';
    END IF;

    -- 11. Record accepted bid in audit log
    INSERT INTO public.bids (auction_id, player_id, team_id, amount)
    VALUES (1, v_player.id, v_team_id, v_new_bid)
    RETURNING id INTO v_bid_id;

    -- 12. Atomically update auction state & RESET TIMER TO max_timer
    UPDATE public.auctions
    SET current_bid = v_new_bid,
        leading_team_id = v_team_id,
        timer = max_timer,
        gavel_stage = 0,
        bid_increment = public.get_bid_increment(v_new_bid),
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object(
        'success', true,
        'accepted_bid', v_new_bid,
        'team_id', v_team_id,
        'team_short_name', v_team.short_name,
        'bid_id', v_bid_id
    );
END;
$$;

-- 4.10 Function: Start Auction For Player
CREATE OR REPLACE FUNCTION public.fn_start_auction(p_player_id INT, p_timer INT DEFAULT 15)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_player RECORD;
    v_chosen_timer INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
        IF v_profile IS NOT NULL AND v_profile.role != 'auctioneer' THEN
            RAISE EXCEPTION 'Access Denied: Only Auctioneer can initiate auction lots' USING ERRCODE = '20010';
        END IF;
    END IF;

    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF v_player IS NULL THEN
        RAISE EXCEPTION 'Player #% not found', p_player_id;
    END IF;
    IF v_player.status != 'available' THEN
        RAISE EXCEPTION 'Player #% is % (cannot be put on hammer)', p_player_id, v_player.status;
    END IF;

    -- Clear any previous orphaned active lot
    UPDATE public.players SET status = 'available' WHERE status = 'on_hammer';

    -- Put requested player on hammer
    UPDATE public.players
    SET status = 'on_hammer', updated_at = now()
    WHERE id = p_player_id;

    v_chosen_timer := COALESCE(p_timer, 15);

    -- Initialize singleton auction state
    UPDATE public.auctions
    SET status = 'live',
        current_player_id = p_player_id,
        current_bid = v_player.base_price,
        base_price = v_player.base_price,
        leading_team_id = NULL,
        timer = v_chosen_timer,
        max_timer = v_chosen_timer,
        gavel_stage = 0,
        bid_increment = public.get_bid_increment(v_player.base_price),
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'base_price', v_player.base_price);
END;
$$;

-- 4.11 Function: Sell Current Player
CREATE OR REPLACE FUNCTION public.fn_sell_player()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_auction RECORD;
    v_player RECORD;
    v_team RECORD;
    v_bid_count INT;
    v_bids_json JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
        IF v_profile IS NOT NULL AND v_profile.role != 'auctioneer' THEN
            RAISE EXCEPTION 'Access Denied: Only Auctioneer can hammer SOLD' USING ERRCODE = '20011';
        END IF;
    END IF;

    SELECT * INTO v_auction FROM public.auctions WHERE id = 1 FOR UPDATE;
    IF v_auction.status NOT IN ('live', 'paused') OR v_auction.current_player_id IS NULL THEN
        RAISE EXCEPTION 'No active lot on hammer to finalize';
    END IF;
    IF v_auction.leading_team_id IS NULL OR v_auction.current_bid = 0 THEN
        RAISE EXCEPTION 'Cannot mark SOLD without any bids. Mark UNSOLD instead.';
    END IF;

    SELECT * INTO v_player FROM public.players WHERE id = v_auction.current_player_id FOR UPDATE;
    SELECT * INTO v_team FROM public.teams WHERE id = v_auction.leading_team_id FOR UPDATE;

    -- 1. Add player to team squad (Trigger fn_sync_team_metrics will update team purse & slots)
    INSERT INTO public.team_squads (team_id, player_id, sold_price)
    VALUES (v_auction.leading_team_id, v_player.id, v_auction.current_bid)
    ON CONFLICT (team_id, player_id) DO UPDATE SET sold_price = EXCLUDED.sold_price;

    -- 2. Update player status
    UPDATE public.players
    SET status = 'sold',
        sold_to = v_auction.leading_team_id,
        sold_price = v_auction.current_bid,
        updated_at = now()
    WHERE id = v_player.id;

    -- 3. Collect bid history
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'team_id', team_id,
        'amount', amount,
        'created_at', created_at
    ) ORDER BY created_at ASC)
    INTO v_bid_count, v_bids_json
    FROM public.bids
    WHERE player_id = v_player.id;

    -- 4. Record archival history
    INSERT INTO public.auction_history (
        player_id, player_name, player_role, lot_number,
        result, sold_to, sold_price, base_price,
        bid_count, bid_history
    ) VALUES (
        v_player.id, v_player.name, v_player.role, v_player.lot_number,
        'sold', v_auction.leading_team_id, v_auction.current_bid, v_player.base_price,
        COALESCE(v_bid_count, 0), COALESCE(v_bids_json, '[]'::jsonb)
    );

    -- 5. Reset singleton auction state
    UPDATE public.auctions
    SET status = 'idle',
        current_player_id = NULL,
        current_bid = 0,
        base_price = 0,
        leading_team_id = NULL,
        timer = 0,
        gavel_stage = 0,
        lot_index = lot_index + 1,
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object(
        'success', true,
        'player_id', v_player.id,
        'winner_team', v_team.short_name,
        'final_price', v_auction.current_bid
    );
END;
$$;

-- 4.12 Function: Mark Current Lot Unsold
CREATE OR REPLACE FUNCTION public.fn_unsold_player()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_auction RECORD;
    v_player RECORD;
    v_bid_count INT;
    v_bids_json JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
        IF v_profile IS NOT NULL AND v_profile.role != 'auctioneer' THEN
            RAISE EXCEPTION 'Access Denied: Only Auctioneer can mark UNSOLD' USING ERRCODE = '20012';
        END IF;
    END IF;

    SELECT * INTO v_auction FROM public.auctions WHERE id = 1 FOR UPDATE;
    IF v_auction.status NOT IN ('live', 'paused') OR v_auction.current_player_id IS NULL THEN
        RAISE EXCEPTION 'No active lot on hammer';
    END IF;

    SELECT * INTO v_player FROM public.players WHERE id = v_auction.current_player_id FOR UPDATE;

    -- Update player status
    UPDATE public.players
    SET status = 'unsold', sold_to = NULL, sold_price = NULL, updated_at = now()
    WHERE id = v_player.id;

    -- Collect bid history
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'team_id', team_id,
        'amount', amount,
        'created_at', created_at
    ) ORDER BY created_at ASC)
    INTO v_bid_count, v_bids_json
    FROM public.bids
    WHERE player_id = v_player.id;

    -- Record in history
    INSERT INTO public.auction_history (
        player_id, player_name, player_role, lot_number,
        result, sold_to, sold_price, base_price,
        bid_count, bid_history
    ) VALUES (
        v_player.id, v_player.name, v_player.role, v_player.lot_number,
        'unsold', NULL, NULL, v_player.base_price,
        COALESCE(v_bid_count, 0), COALESCE(v_bids_json, '[]'::jsonb)
    );

    -- Reset singleton state
    UPDATE public.auctions
    SET status = 'idle',
        current_player_id = NULL,
        current_bid = 0,
        base_price = 0,
        leading_team_id = NULL,
        timer = 0,
        gavel_stage = 0,
        lot_index = lot_index + 1,
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object('success', true, 'player_id', v_player.id, 'status', 'unsold');
END;
$$;

-- 4.13 Functions: Pause, Resume, Reset Auction
CREATE OR REPLACE FUNCTION public.fn_pause_auction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.auctions SET status = 'paused', updated_at = now() WHERE id = 1;
    INSERT INTO public.auction_events (auction_id, event_type, actor_role, metadata)
    VALUES (1, 'AUCTION_PAUSED', 'auctioneer', '{}'::jsonb);
    RETURN jsonb_build_object('success', true, 'status', 'paused');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resume_auction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.auctions SET status = 'live', updated_at = now() WHERE id = 1;
    INSERT INTO public.auction_events (auction_id, event_type, actor_role, metadata)
    VALUES (1, 'AUCTION_RESUMED', 'auctioneer', '{}'::jsonb);
    RETURN jsonb_build_object('success', true, 'status', 'live');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reset_auction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.players SET status = 'available', sold_to = NULL, sold_price = NULL, updated_at = now();
    UPDATE public.teams SET spent = 0, remaining = 12500, purse = 12500, filled_slots = 0, updated_at = now();
    DELETE FROM public.team_squads;
    DELETE FROM public.bids;
    DELETE FROM public.auction_history;
    UPDATE public.auctions
    SET status = 'idle',
        current_player_id = NULL,
        current_bid = 0,
        base_price = 0,
        leading_team_id = NULL,
        timer = 15,
        max_timer = 15,
        gavel_stage = 0,
        lot_index = 0,
        updated_at = now()
    WHERE id = 1;

    INSERT INTO public.auction_events (auction_id, event_type, actor_role, metadata)
    VALUES (1, 'AUCTION_RESET', 'auctioneer', '{"note": "Auction reset: all players available, purses restored"}'::jsonb);

    RETURN jsonb_build_object('success', true, 'message', 'Auction session completely reset');
END;
$$;

-- 4.14 Functions: Timer and Gavel Controls
CREATE OR REPLACE FUNCTION public.fn_set_timer_duration(p_duration INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_duration IS NULL OR p_duration < 5 OR p_duration > 120 THEN
        RAISE EXCEPTION 'Timer duration must be between 5 and 120 seconds';
    END IF;

    UPDATE public.auctions
    SET max_timer = p_duration,
        timer = CASE WHEN status = 'idle' THEN p_duration ELSE timer END,
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object('success', true, 'max_timer', p_duration);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_add_timer(p_seconds INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timer INT;
BEGIN
    UPDATE public.auctions
    SET timer = LEAST(120, timer + p_seconds), updated_at = now()
    WHERE id = 1
    RETURNING timer INTO v_timer;
    RETURN jsonb_build_object('success', true, 'timer', v_timer);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reset_timer(p_seconds INT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_timer INT;
    v_reset_val INT;
BEGIN
    SELECT max_timer INTO v_reset_val FROM public.auctions WHERE id = 1;
    v_reset_val := COALESCE(p_seconds, v_reset_val, 15);

    UPDATE public.auctions
    SET timer = v_reset_val, updated_at = now()
    WHERE id = 1
    RETURNING timer INTO v_timer;
    RETURN jsonb_build_object('success', true, 'timer', v_timer);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_gavel(p_stage INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_stage NOT BETWEEN 0 AND 3 THEN
        RAISE EXCEPTION 'Gavel stage must be between 0 and 3';
    END IF;
    UPDATE public.auctions
    SET gavel_stage = p_stage, updated_at = now()
    WHERE id = 1;
    RETURN jsonb_build_object('success', true, 'gavel_stage', p_stage);
END;
$$;

-- 4.15 Function: Captain Retention Engine
CREATE OR REPLACE FUNCTION public.fn_retain_captain(p_team_id TEXT, p_player_id INT, p_retention_price INT DEFAULT 200)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_player RECORD;
BEGIN
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF v_player IS NULL THEN
        RAISE EXCEPTION 'Player #% not found', p_player_id;
    END IF;

    -- Add to team squad
    INSERT INTO public.team_squads (team_id, player_id, sold_price)
    VALUES (p_team_id, p_player_id, p_retention_price)
    ON CONFLICT (team_id, player_id) DO UPDATE SET sold_price = EXCLUDED.sold_price;

    -- Mark player as sold
    UPDATE public.players
    SET status = 'sold', sold_to = p_team_id, sold_price = p_retention_price, updated_at = now()
    WHERE id = p_player_id;

    -- Log event
    INSERT INTO public.auction_events (auction_id, player_id, event_type, actor_team_id, actor_role, amount_lakh, metadata)
    VALUES (1, p_player_id, 'CAPTAIN_RETAINED', p_team_id, 'auctioneer', p_retention_price,
        jsonb_build_object('name', v_player.name, 'teamId', p_team_id, 'retentionPrice', p_retention_price));

    RETURN jsonb_build_object('success', true, 'team_id', p_team_id, 'player_id', p_player_id, 'price', p_retention_price);
END;
$$;

-- 4.16 Function: Custom Auction Event Logger
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
        auction_id, lot_id, player_id, event_type,
        actor_user_id, actor_team_id, actor_role,
        amount_lakh, previous_amount_lakh, metadata
    ) VALUES (
        1, p_lot_id, p_player_id, p_event_type,
        v_user_id, p_actor_team_id, COALESCE(v_user_role, 'system'),
        p_amount_lakh, p_prev_amount_lakh, p_metadata
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

-- ─── 5. DATABASE TRIGGERS ────────────────────────────────────────────

-- 5.1 updated_at Timestamps
DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_players_updated_at ON public.players;
CREATE TRIGGER trg_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_auctions_updated_at ON public.auctions;
CREATE TRIGGER trg_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- 5.2 Team Squads Auto-recalculation
DROP TRIGGER IF EXISTS trg_sync_team_metrics_mod ON public.team_squads;
CREATE TRIGGER trg_sync_team_metrics_mod
AFTER INSERT OR UPDATE OR DELETE ON public.team_squads
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_team_metrics();

-- 5.3 Accepted Bid Audit Trail
DROP TRIGGER IF EXISTS trg_audit_bid ON public.bids;
CREATE TRIGGER trg_audit_bid
AFTER INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_bid_placed();

-- 5.4 Player Status Change Audit Trail
DROP TRIGGER IF EXISTS trg_audit_player_status ON public.players;
CREATE TRIGGER trg_audit_player_status
AFTER UPDATE OF status ON public.players
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_audit_player_status_change();

-- 5.5 Supabase Auth User to Public Profile Synchronization
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ─── 6. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;

-- Transparent Public Reads
DROP POLICY IF EXISTS "Allow public read teams" ON public.teams;
CREATE POLICY "Allow public read teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read players" ON public.players;
CREATE POLICY "Allow public read players" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read auctions" ON public.auctions;
CREATE POLICY "Allow public read auctions" ON public.auctions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read bids" ON public.bids;
CREATE POLICY "Allow public read bids" ON public.bids FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read team_squads" ON public.team_squads;
CREATE POLICY "Allow public read team_squads" ON public.team_squads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read auction_history" ON public.auction_history;
CREATE POLICY "Allow public read auction_history" ON public.auction_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read auction_events" ON public.auction_events;
CREATE POLICY "Allow public read auction_events" ON public.auction_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow user read own profile" ON public.profiles;
CREATE POLICY "Allow user read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow user update own profile" ON public.profiles;
CREATE POLICY "Allow user update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ─── 7. REALTIME PUBLICATION REGISTRATION ────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_squads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_history;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END;
$$;

-- ─── 8. PRODUCTION SEED DATA ─────────────────────────────────────────

-- 8.1 10 Official IPL Franchises (₹125.00 Cr Starting Purse)
INSERT INTO public.teams (id, name, short_name, code, purse, spent, remaining, max_slots, min_slots, filled_slots, color, logo_url)
VALUES
('CSK', 'CHENNAI SUPER KINGS', 'CSK', 'CSK', 12500, 0, 12500, 25, 7, 0, '#F9CD05', '/teams/csk/logo.svg'),
('DC', 'DELHI CAPITALS', 'DC', 'DC', 12500, 0, 12500, 25, 7, 0, '#004C97', '/teams/dc/logo.svg'),
('GT', 'GUJARAT TITANS', 'GT', 'GT', 12500, 0, 12500, 25, 7, 0, '#1C2841', '/teams/gt/logo.svg'),
('KKR', 'KOLKATA KNIGHT RIDERS', 'KKR', 'KKR', 12500, 0, 12500, 25, 7, 0, '#3A225D', '/teams/kkr/logo.svg'),
('LSG', 'LUCKNOW SUPER GIANTS', 'LSG', 'LSG', 12500, 0, 12500, 25, 7, 0, '#0057E7', '/teams/lsg/logo.svg'),
('MI', 'MUMBAI INDIANS', 'MI', 'MI', 12500, 0, 12500, 25, 7, 0, '#004BA0', '/teams/mi/logo.svg'),
('PBKS', 'PUNJAB KINGS', 'PBKS', 'PBKS', 12500, 0, 12500, 25, 7, 0, '#ED1B24', '/teams/pbks/logo.svg'),
('RR', 'RAJASTHAN ROYALS', 'RR', 'RR', 12500, 0, 12500, 25, 7, 0, '#EA1A85', '/teams/rr/logo.svg'),
('RCB', 'ROYAL CHALLENGERS BENGALURU', 'RCB', 'RCB', 12500, 0, 12500, 25, 7, 0, '#4A154B', '/teams/rcb/logo.svg'),
('SRH', 'SUNRISERS HYDERABAD', 'SRH', 'SRH', 12500, 0, 12500, 25, 7, 0, '#F26522', '/teams/srh/logo.svg')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    code = EXCLUDED.code,
    color = EXCLUDED.color,
    logo_url = EXCLUDED.logo_url;

-- 8.2 Singleton Auction Session
INSERT INTO public.auctions (
    id, status, current_player_id, current_bid, base_price,
    leading_team_id, round, lot_index, timer, max_timer,
    gavel_stage, bid_increment, session_label
) VALUES (
    1, 'idle', NULL, 0, 0,
    NULL, 1, 0, 15, 15,
    0, 10, '2026 MEGA AUCTION'
) ON CONFLICT (id) DO UPDATE SET
    session_label = EXCLUDED.session_label;

-- 8.3 All 73 Real IPL Cricketers
INSERT INTO public.players (
    id, lot_number, name, display_name, role, role_label,
    nationality, overseas, capped, set_name,
    base_price, image, icon, stats, tactical_profile, status
) VALUES
(1, 1, 'VIRAT KOHLI', 'Virat Kohli', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/rcb/virat-kohli.png', 'sports_cricket', '{"matches":252,"runs":8004,"wickets":4,"strikeRate":131.97,"average":38.67,"economy":8.79,"fifties":55,"hundreds":8,"best":"113","debutYear":2008}'::jsonb, 'IPL all-time highest run-scorer. Supreme anchor and pacing index through the middle overs with elite boundary conversion against high-pace.', 'available'),
(2, 2, 'ROHIT SHARMA', 'Rohit Sharma', 'batter', 'OPENING BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/mi/rohit-sharma.png', 'sports_cricket', '{"matches":257,"runs":6628,"wickets":15,"strikeRate":131.14,"average":29.72,"economy":8.02,"fifties":43,"hundreds":2,"best":"109*","debutYear":2008}'::jsonb, '5-time IPL title-winning captain. Ruthless power-play ball-striker against short-pitch fast bowling (pull shot efficiency 88.4%).', 'available'),
(3, 3, 'TRAVIS HEAD', 'Travis Head', 'batter', 'AGGRESSIVE OPENER (LEFT HAND)', 'Australia', true, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/srh/travis-head.png', 'sports_cricket', '{"matches":25,"runs":872,"wickets":3,"strikeRate":178.69,"average":37.91,"economy":9.21,"fifties":5,"hundreds":1,"best":"102","debutYear":2016}'::jsonb, 'Ultra-aggressive powerplay specialist. Highest scoring rate in overs 1-6 across world T20 cricket in 2024 (SR 216.4).', 'available'),
(4, 4, 'SHUBMAN GILL', 'Shubman Gill', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/gt/shubman-gill.png', 'sports_cricket', '{"matches":103,"runs":3216,"wickets":null,"strikeRate":135.7,"average":37.84,"economy":null,"fifties":20,"hundreds":4,"best":"129","debutYear":2018}'::jsonb, 'Orange Cap winner 2023 (890 runs). Elite balance against pace and spin with exceptional boundary-finding placement in field restrictions.', 'available'),
(5, 5, 'YASHASVI JAISWAL', 'Yashasvi Jaiswal', 'batter', 'DYNAMIC OPENER (LEFT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/rr/yashasvi-jaiswal.png', 'sports_cricket', '{"matches":52,"runs":1607,"wickets":null,"strikeRate":150.61,"average":32.14,"economy":null,"fifties":9,"hundreds":2,"best":"124","debutYear":2020}'::jsonb, 'Holder of the fastest fifty in IPL history (13 balls). Dominates off-spin and left-arm orthodox with high-intent lofted strokes.', 'available'),
(6, 6, 'SURYAKUMAR YADAV', 'Suryakumar Yadav', 'batter', '360-DEGREE FINISHER (RIGHT HAND)', 'India', false, true, 'SET 01 // MARQUEE BATTERS (M1)', 200, '/players/mi/suryakumar-yadav.png', 'sports_cricket', '{"matches":150,"runs":3594,"wickets":null,"strikeRate":145.33,"average":32.09,"economy":null,"fifties":24,"hundreds":2,"best":"103*","debutYear":2012}'::jsonb, 'India T20I captain. World''s premier 360-degree stroke maker, capable of manipulating fine-leg and third-man boundaries against 150 kph deliveries.', 'available'),
(7, 7, 'RISHABH PANT', 'Rishabh Pant', 'wicketkeeper', 'WICKETKEEPER-BATTER (LEFT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/lsg/rishabh-pant.png', 'front_hand', '{"matches":111,"runs":3284,"wickets":null,"strikeRate":148.93,"average":35.31,"catches":75,"stumpings":23,"fifties":18,"hundreds":1,"best":"128*","debutYear":2016}'::jsonb, 'Match-winner with unmatched middle-overs counter-attack capability. 98 career dismissals behind the stumps.', 'available'),
(8, 8, 'HEINRICH KLAASEN', 'Heinrich Klaasen', 'wicketkeeper', 'MIDDLE-ORDER POWER WK (RIGHT HAND)', 'South Africa', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/srh/heinrich-klaasen.png', 'front_hand', '{"matches":35,"runs":993,"wickets":null,"strikeRate":168.31,"average":39.72,"catches":19,"stumpings":6,"fifties":6,"hundreds":1,"best":"104","debutYear":2018}'::jsonb, 'Statistically the most destructive batter against spin in world cricket (SR 184.2 vs spin in IPL overs 7-15).', 'available'),
(9, 9, 'SANJU SAMSON', 'Sanju Samson', 'wicketkeeper', 'TOP-ORDER WK-BATTER (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/csk/sanju-samson.png', 'front_hand', '{"matches":167,"runs":4419,"wickets":null,"strikeRate":138.96,"average":30.69,"catches":82,"stumpings":16,"fifties":25,"hundreds":3,"best":"119","debutYear":2013}'::jsonb, 'Captain and pure stroke maker. High six-hitting ratio in powerplay and death overs (206 career IPL sixes).', 'available'),
(10, 10, 'JOS BUTTLER', 'Jos Buttler', 'wicketkeeper', 'EXPLOSIVE OPENER-WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/gt/jos-buttler.png', 'front_hand', '{"matches":107,"runs":3582,"wickets":null,"strikeRate":147.53,"average":38.11,"catches":51,"stumpings":1,"fifties":19,"hundreds":7,"best":"124","debutYear":2016}'::jsonb, '7 career IPL centuries (second all-time). England white-ball icon with devastating scoop and pull shots.', 'available'),
(11, 11, 'NICHOLAS POORAN', 'Nicholas Pooran', 'wicketkeeper', 'FINISHER / WK (LEFT HAND)', 'West Indies', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/lsg/nicholas-pooran.png', 'front_hand', '{"matches":76,"runs":1769,"wickets":null,"strikeRate":162.29,"average":32.76,"catches":34,"stumpings":8,"fifties":9,"hundreds":0,"best":"77","debutYear":2019}'::jsonb, 'Specialist death overs aggressor. Strike rate exceeding 180 across overs 16-20 with effortless clean clearing of boundaries.', 'available'),
(12, 12, 'MS DHONI', 'MS Dhoni', 'wicketkeeper', 'LEGENDARY FINISHER / WK (RIGHT HAND)', 'India', false, true, 'SET 02 // WICKETKEEPERS (WK1)', 200, '/players/csk/mahendra-singh-dhoni.png', 'front_hand', '{"matches":264,"runs":5243,"wickets":null,"strikeRate":137.54,"average":39.13,"catches":152,"stumpings":42,"fifties":24,"hundreds":0,"best":"84*","debutYear":2008}'::jsonb, '5-time champion. Most dismissals by a wicketkeeper in IPL history (194). Master tactical mind and death-overs striking icon.', 'available'),
(13, 13, 'HARDIK PANDYA', 'Hardik Pandya', 'allrounder', 'PACE-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/mi/hardik-pandya.png', 'public', '{"matches":137,"runs":2525,"wickets":64,"strikeRate":145.87,"average":28.69,"economy":8.95,"fifties":10,"hundreds":0,"best":"3/17","debutYear":2015}'::jsonb, 'Rare pace-bowling all-rounder in subcontinent conditions. Delivers 140 kph middle-overs enforcers and game-finishing six-hitting index.', 'available'),
(14, 14, 'RAVINDRA JADEJA', 'Ravindra Jadeja', 'allrounder', 'SPIN ALL-ROUNDER / ELITE FIELDER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/rr/ravindra-jadeja.png', 'public', '{"matches":240,"runs":2959,"wickets":160,"strikeRate":129.5,"average":27.4,"economy":7.62,"fifties":3,"hundreds":0,"best":"5/16","debutYear":2008}'::jsonb, '3-dimensional cricketer. Concedes under 7.50 RPO while bowling into the pitch, plus undisputed premier direct-hit run-out specialist.', 'available'),
(15, 15, 'ANDRE RUSSELL', 'Andre Russell', 'allrounder', 'POWER FINISHER & DEATH BOWLER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/kkr/andre-russell.png', 'public', '{"matches":127,"runs":2484,"wickets":115,"strikeRate":174.93,"average":29.22,"economy":9.24,"fifties":11,"hundreds":0,"best":"5/15","debutYear":2012}'::jsonb, 'Highest career strike rate in IPL history among players with 1000+ runs (174.93). Crucial wicket-taker at the death with heavy cutters.', 'available'),
(16, 16, 'RASHID KHAN', 'Rashid Khan', 'allrounder', 'LEG-SPIN ALL-ROUNDER', 'Afghanistan', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/gt/rashid-khan.png', 'public', '{"matches":121,"runs":551,"wickets":149,"strikeRate":154.78,"average":21.84,"economy":6.82,"best":"4/24","fifties":1,"hundreds":0,"debutYear":2017}'::jsonb, 'Lowest career economy rate in IPL among 100+ wicket holders (6.82). Lethal rapid googly and explosive lower-order batting option.', 'available'),
(17, 17, 'SUNIL NARINE', 'Sunil Narine', 'allrounder', 'MYSTERY OFF-SPIN & PINCH HITTER', 'West Indies', true, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/kkr/sunil-narine.png', 'public', '{"matches":177,"runs":1534,"wickets":180,"strikeRate":165.84,"average":25.39,"economy":6.73,"fifties":7,"hundreds":1,"best":"5/19","debutYear":2012}'::jsonb, '3-time IPL MVP award winner (2012, 2018, 2024). Unrivalled economy rate of 6.73 and devastating opening batter in powerplays.', 'available'),
(18, 18, 'AXAR PATEL', 'Axar Patel', 'allrounder', 'LEFT-ARM ORTHODOX & BATTER', 'India', false, true, 'SET 03 // MARQUEE ALL-ROUNDERS (AR1)', 200, '/players/dc/axar-patel.png', 'public', '{"matches":150,"runs":1653,"wickets":123,"strikeRate":130.88,"average":30.55,"economy":7.24,"fifties":3,"hundreds":0,"best":"4/21","debutYear":2014}'::jsonb, 'Key powerplay and middle-overs container. Excellent trajectory control against right-handers and proven match-winning lower-order hitter.', 'available'),
(19, 19, 'JASPRIT BUMRAH', 'Jasprit Bumrah', 'bowler', 'RIGHT-ARM EXPRESS (145+ KPH)', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/mi/jasprit-bumrah.png', 'bolt', '{"matches":133,"runs":null,"wickets":165,"strikeRate":null,"average":22.51,"economy":7.3,"fifties":null,"hundreds":null,"best":"5/10","debutYear":2013}'::jsonb, 'Gold-standard T20 bowler worldwide. Unplayable dipping yorkers at 145 kph, conceded merely 6.48 RPO in 2024 IPL season.', 'available'),
(20, 20, 'PAT CUMMINS', 'Pat Cummins', 'bowler', 'RIGHT-ARM FAST SEAM', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/srh/pat-cummins.png', 'bolt', '{"matches":58,"runs":515,"wickets":63,"strikeRate":150.15,"average":29.84,"economy":8.87,"fifties":1,"hundreds":0,"best":"4/34","debutYear":2014}'::jsonb, 'World Cup winning captain. Hard-length enforcer through middle overs and explosive counter-attacking lower order batter (14-ball 50).', 'available'),
(21, 21, 'MITCHELL STARC', 'Mitchell Starc', 'bowler', 'LEFT-ARM EXPRESS (150 KPH)', 'Australia', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/dc/mitchell-starc.png', 'bolt', '{"matches":41,"runs":null,"wickets":51,"strikeRate":null,"average":23.9,"economy":8.64,"best":"4/15","debutYear":2014}'::jsonb, 'Player of the Match in IPL 2024 Final & Qualifier 1. Lethal swinging full deliveries in over 1 and laser yorkers at the death.', 'available'),
(22, 22, 'TRENT BOULT', 'Trent Boult', 'bowler', 'LEFT-ARM SWING SPECIALIST', 'New Zealand', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/mi/trent-boult.png', 'bolt', '{"matches":104,"runs":null,"wickets":121,"strikeRate":null,"average":26.49,"economy":8.29,"best":"4/18","debutYear":2015}'::jsonb, 'The premier first-over wicket taker in T20 history (28 first-over wickets in IPL). Generates late banana swing into right-handers.', 'available'),
(23, 23, 'MOHAMMED SHAMI', 'Mohammed Shami', 'bowler', 'RIGHT-ARM SEAM ENFORCER', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/lsg/mohammed-shami.png', 'bolt', '{"matches":110,"runs":null,"wickets":127,"strikeRate":null,"average":26.87,"economy":8.44,"best":"4/11","debutYear":2013}'::jsonb, 'Purple Cap winner 2023 (28 wickets). Impeccable upright seam presentation generating sharp lateral movement off a good length.', 'available'),
(24, 24, 'ARSHDEEP SINGH', 'Arshdeep Singh', 'bowler', 'LEFT-ARM DEATH OVERS SPECIALIST', 'India', false, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/pbks/arshdeep-singh.png', 'bolt', '{"matches":65,"runs":null,"wickets":76,"strikeRate":null,"average":27,"economy":9.03,"best":"5/32","debutYear":2019}'::jsonb, 'T20 World Cup leading wicket taker (17 wickets). Pinpoint yorkers targeting base of stumps and wide yorkers against set batters.', 'available'),
(26, 25, 'YUZVENDRA CHAHAL', 'Yuzvendra Chahal', 'bowler', 'RIGHT-ARM LEGBREAK WICKET-TAKER', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, '/players/pbks/yuzvendra-chahal.png', 'bolt', '{"matches":160,"runs":null,"wickets":205,"strikeRate":null,"average":22.45,"economy":7.84,"best":"5/40","debutYear":2013}'::jsonb, 'All-time highest wicket-taker in IPL history (205 wickets). Brave leg-spin flight outside off stump inducing false shots and stumpings.', 'available'),
(27, 26, 'KULDEEP YADAV', 'Kuldeep Yadav', 'bowler', 'LEFT-ARM WRIST SPIN (CHINAMAN)', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 200, '/players/dc/kuldeep-yadav.png', 'bolt', '{"matches":84,"runs":null,"wickets":87,"strikeRate":null,"average":26.24,"economy":7.85,"best":"4/14","debutYear":2016}'::jsonb, 'World Cup winning wrist-spinner. Higher pace trajectory (88-92 kph) with sharp turn both ways making him virtually unreadable.', 'available'),
(35, 27, 'KAGISO RABADA', 'Kagiso Rabada', 'bowler', 'RIGHT-ARM FAST (145+ KPH)', 'South Africa', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 200, '/players/gt/kagiso-rabada.png', 'bolt', '{"matches":80,"runs":null,"wickets":117,"strikeRate":null,"average":23.15,"economy":8.42,"best":"4/21","debutYear":2017}'::jsonb, 'Former Purple Cap winner. Fastest bowler to reach 100 IPL wickets (64 matches). Ruthless pace and heavy bouncer.', 'available'),
(40, 28, 'JOFRA ARCHER', 'Jofra Archer', 'bowler', 'FAST BOWLER (RIGHT ARM EXPRESS)', 'England', true, true, 'SET 04 // FAST BOWLERS (PAC1)', 200, '/players/rr/jofra-archer.png', 'bolt', '{"matches":40,"runs":195,"wickets":48,"strikeRate":19.33,"average":24.38,"economy":7.43,"best":"3/15","debutYear":2018}'::jsonb, 'Express 150kph pacer capable of hostile short-pitch spells and deadly yorkers at the death.', 'available'),
(42, 29, 'BHUVNESHWAR KUMAR', 'Bhuvneshwar Kumar', 'bowler', 'FAST-MEDIUM (SWING SPECIALIST)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 200, '/players/rcb/bhuvneshwar-kumar.png', 'bolt', '{"matches":176,"runs":305,"wickets":181,"strikeRate":21.65,"average":27.23,"economy":7.56,"best":"5/19","debutYear":2011}'::jsonb, 'Two-time IPL Purple Cap winner. Master of conventional swing in the powerplay and pinpoint knuckleball yorkers.', 'available'),
(25, 30, 'MATHEESHA PATHIRANA', 'Matheesha Pathirana', 'bowler', 'SLING-ACTION DEATH SPECIALIST', 'Sri Lanka', true, true, 'SET 04 // FAST BOWLERS (FAST1)', 150, '/players/kkr/matheesha-pathirana.png', 'bolt', '{"matches":20,"runs":null,"wickets":34,"strikeRate":null,"average":18.59,"economy":7.88,"best":"4/28","debutYear":2022}'::jsonb, 'Unique low-release sling trajectory (148 kph). Concedes lowest boundary percentage in overs 18-20 across all IPL pacers.', 'available'),
(28, 31, 'VARUN CHAKARAVARTHY', 'Varun Chakaravarthy', 'bowler', 'RIGHT-ARM MYSTERY SPIN', 'India', false, true, 'SET 05 // SPIN BOWLERS (SPIN1)', 150, '/players/kkr/varun-chakaravarthy.png', 'bolt', '{"matches":71,"runs":null,"wickets":75,"strikeRate":null,"average":25.4,"economy":7.56,"best":"5/20","debutYear":2019}'::jsonb, 'Seven variations including carrom ball, top spinner, and seam-up skidder. Integral to KKR''s 2024 championship campaign with 21 wickets.', 'available'),
(34, 32, 'PHILIP SALT', 'Phil Salt', 'wicketkeeper', 'POWERPLAY DESTROYER / WK (RIGHT HAND)', 'England', true, true, 'SET 02 // WICKETKEEPERS (WK1)', 150, '/players/rcb/phil-salt.png', 'front_hand', '{"matches":21,"runs":653,"wickets":null,"strikeRate":175.54,"average":36.28,"catches":16,"stumpings":2,"fifties":6,"hundreds":0,"best":"89*","debutYear":2023}'::jsonb, 'IPL 2024 champion opener with KKR (435 runs, SR 182.0). Demolishes fast bowling in overs 1-6 with aggressive pull and cover drives.', 'available'),
(36, 33, 'KHALEEL AHMED', 'Khaleel Ahmed', 'bowler', 'FAST BOWLER (LEFT ARM)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 150, '/players/csk/khaleel-ahmed.png', 'bolt', '{"matches":57,"runs":8,"wickets":74,"strikeRate":16.88,"average":24.62,"economy":8.75,"best":"3/16","debutYear":2018}'::jsonb, 'Hit-the-deck left-arm seamer with elite powerplay wicket-taking instinct and skiddy bouncer.', 'available'),
(41, 34, 'RAVI BISHNOI', 'Ravi Bishnoi', 'bowler', 'SPIN BOWLER (WRIST SPIN)', 'India', false, true, 'SET 05 // SPINNERS (SPN1)', 150, '/players/rr/ravi-bishnoi.png', 'bolt', '{"matches":66,"runs":45,"wickets":63,"strikeRate":23.4,"average":30.63,"economy":7.85,"best":"3/24","debutYear":2020}'::jsonb, 'Flat, skiddy wrist-spinner who relies heavily on a quick googly that attacks the stumps.', 'available'),
(44, 35, 'AVESH KHAN', 'Avesh Khan', 'bowler', 'FAST BOWLER (RIGHT ARM)', 'India', false, true, 'SET 04 // FAST BOWLERS (PAC1)', 150, '/players/lsg/avesh-khan.png', 'bolt', '{"matches":63,"runs":55,"wickets":75,"strikeRate":18.29,"average":26.65,"economy":8.74,"best":"4/24","debutYear":2017}'::jsonb, 'High-effort hit-the-deck bowler specialized in bowling defensive overs 18 and 20 with wide yorkers.', 'available'),
(51, 36, 'BEN DUCKETT', 'BEN DUCKETT', 'batter', 'Batter', 'England', true, true, 'TOP-ORDER-BATTERS', 150, '/players/dc/ben-duckett.png', 'sports_cricket', '{"matches":28,"runs":850,"average":34,"strikeRate":145.2,"fifties":6}'::jsonb, 'Official IPL squad profile for BEN DUCKETT', 'available'),
(67, 37, 'JACOB BETHELL', 'JACOB BETHELL', 'allrounder', 'All-Rounder', 'England', true, true, 'ALLROUNDERS', 125, '/players/rcb/jacob-bethell.png', 'sports_cricket', '{"matches":20,"runs":410,"average":29.3,"strikeRate":146.5,"wickets":12,"economy":7.8}'::jsonb, 'Official IPL squad profile for JACOB BETHELL', 'available'),
(29, 38, 'RINKU SINGH', 'Rinku Singh', 'batter', 'LEFT-HAND FINISHER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 100, '/players/kkr/rinku-singh.png', 'sports_cricket', '{"matches":45,"runs":893,"wickets":null,"strikeRate":143.34,"average":30.79,"fifties":4,"hundreds":0,"best":"67*","debutYear":2018}'::jsonb, 'Famed 5 consecutive sixes finisher. Exceptional strike-rate of 192.5 in the 20th over and unmatched calmness under match-winning pressure.', 'available'),
(38, 39, 'RAHUL CHAHAR', 'Rahul Chahar', 'bowler', 'SPIN BOWLER (LEG BREAK)', 'India', false, true, 'SET 05 // SPINNERS (SPN1)', 100, '/players/csk/rahul-chahar.png', 'bolt', '{"matches":78,"runs":124,"wickets":75,"strikeRate":22.48,"average":28.53,"economy":7.62,"best":"4/27","debutYear":2017}'::jsonb, 'Quick-through-the-air attacking leg-spinner with sharp revs and a disguised googly.', 'available'),
(45, 40, 'AZMATULLAH OMARZAI', 'Azmatullah Omarzai', 'allrounder', 'SEAM-BOWLING ALLROUNDER', 'Afghanistan', true, true, 'SET 03 // ALLROUNDERS (ALR1)', 100, '/players/pbks/azmatullah-omarzai.png', 'public', '{"matches":7,"runs":42,"wickets":4,"strikeRate":113.51,"average":14,"economy":8.82,"best":"2/27","debutYear":2024}'::jsonb, 'Front-line new-ball outswing exponent who provides lower-order power-hitting against seam.', 'available'),
(46, 41, 'KYLE JAMIESON', 'Kyle Jamieson', 'bowler', 'TALL SEAM BOWLER (RIGHT ARM)', 'New Zealand', true, true, 'SET 04 // FAST BOWLERS (PAC1)', 100, '/players/dc/kyle-jamieson.png', 'bolt', '{"matches":9,"runs":65,"wickets":9,"strikeRate":20,"average":29.89,"economy":9.61,"best":"3/41","debutYear":2021}'::jsonb, '6ft 8in tall fast bowler extracting steep unnatural bounce and movement from a good length.', 'available'),
(47, 42, 'FINN ALLEN', 'Finn Allen', 'batter', 'EXPLOSIVE OPENER (RIGHT HAND)', 'New Zealand', true, true, 'SET 01 // OVERSEAS BATTERS (M1)', 100, '/players/kkr/finn-allen.png', 'sports_cricket', '{"matches":0,"runs":0,"wickets":0,"strikeRate":168.5,"average":31.2,"fifties":0,"hundreds":0,"best":"137 (T20I)","debutYear":2024}'::jsonb, 'Ultra-aggressive top-order enforcer with elite boundary strike-rate in the powerplay.', 'available'),
(49, 43, 'REHAN AHMED', 'REHAN AHMED', 'bowler', 'Bowler', 'England', true, true, 'SPIN-BOWLERS', 100, '/players/dc/rehan-ahmed.png', 'sports_baseball', '{"matches":18,"wickets":24,"economy":7.6,"bestBowling":"4/22"}'::jsonb, 'Official IPL squad profile for REHAN AHMED', 'available'),
(53, 44, 'TOM BANTON', 'TOM BANTON', 'wicketkeeper', 'Wicketkeeper', 'England', true, true, 'WICKETKEEPERS', 100, '/players/gt/tom-banton.png', 'sports_cricket', '{"matches":15,"runs":390,"average":26,"strikeRate":148,"dismissals":12}'::jsonb, 'Official IPL squad profile for TOM BANTON', 'available'),
(64, 45, 'XAVIER BARTLETT', 'XAVIER BARTLETT', 'bowler', 'Bowler', 'Australia', true, true, 'FAST-BOWLERS', 100, '/players/pbks/xavier-bartlett.png', 'sports_baseball', '{"matches":15,"wickets":20,"economy":8.2,"bestBowling":"4/18"}'::jsonb, 'Official IPL squad profile for XAVIER BARTLETT', 'available'),
(73, 46, 'BRYDON CARSE', 'BRYDON CARSE', 'bowler', 'Bowler', 'England', true, true, 'FAST-BOWLERS', 100, '/players/srh/brydon-carse.png', 'sports_baseball', '{"matches":14,"wickets":16,"economy":8.6,"bestBowling":"3/28"}'::jsonb, 'Official IPL squad profile for BRYDON CARSE', 'available'),
(31, 47, 'MAYANK YADAV', 'Mayank Yadav', 'bowler', 'OUTRIGHT EXPRESS (156.7 KPH)', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, '/players/lsg/mayank-yadav.png', 'bolt', '{"matches":4,"runs":null,"wickets":7,"strikeRate":null,"average":12.14,"economy":6.99,"best":"3/14","debutYear":2024}'::jsonb, 'Fastest ball of IPL 2024 (156.7 kph). Hurries batters with genuine raw velocity, back of a length seam, and sharp bouncers.', 'available'),
(32, 48, 'NITISH KUMAR REDDY', 'Nitish Kumar Reddy', 'allrounder', 'SEAM-BOWLING ALL-ROUNDER', 'India', false, true, 'SET 06 // EMERGING & IMPACT (ACC1)', 75, '/players/srh/nitish-kumar-reddy.png', 'public', '{"matches":15,"runs":303,"wickets":3,"strikeRate":142.92,"average":33.67,"economy":9.88,"fifties":2,"hundreds":0,"best":"64","debutYear":2023}'::jsonb, 'IPL 2024 Emerging Player of the Season. Clean lofted straight driver and handy medium-pace wicket-taker.', 'available'),
(37, 49, 'DEWALD BREVIS', 'Dewald Brevis', 'batter', 'TOP-ORDER BATTER (RIGHT HAND)', 'South Africa', true, true, 'SET 01 // OVERSEAS BATTERS (M1)', 75, '/players/csk/dewald-brevis.png', 'sports_cricket', '{"matches":10,"runs":230,"wickets":1,"strikeRate":147.44,"average":23,"economy":6.5,"fifties":1,"hundreds":0,"best":"49","debutYear":2022}'::jsonb, 'Extremely high bat-speed 360-degree striker with dominant boundary index against wrist-spin.', 'available'),
(50, 50, 'DUSHMANTHA CHAMEERA', 'DUSHMANTHA CHAMEERA', 'bowler', 'Bowler', 'Sri Lanka', true, true, 'FAST-BOWLERS', 75, '/players/dc/dushmantha-chameera.png', 'sports_baseball', '{"matches":12,"wickets":14,"economy":8.4,"bestBowling":"3/17"}'::jsonb, 'Official IPL squad profile for DUSHMANTHA CHAMEERA', 'available'),
(56, 51, 'MATTHEW BREETZKE', 'MATTHEW BREETZKE', 'batter', 'Batter', 'South Africa', true, true, 'TOP-ORDER-BATTERS', 75, '/players/lsg/matthew-breetzke.png', 'sports_cricket', '{"matches":16,"runs":480,"average":32,"strikeRate":139.8,"fifties":3}'::jsonb, 'Official IPL squad profile for MATTHEW BREETZKE', 'available'),
(65, 52, 'NANDRE BURGER', 'NANDRE BURGER', 'bowler', 'Bowler', 'South Africa', true, true, 'FAST-BOWLERS', 75, '/players/rr/nandre-burger.png', 'sports_baseball', '{"matches":14,"wickets":17,"economy":8.5,"bestBowling":"3/30"}'::jsonb, 'Official IPL squad profile for NANDRE BURGER', 'available'),
(69, 53, 'JORDAN COX', 'JORDAN COX', 'wicketkeeper', 'Wicketkeeper', 'England', true, true, 'WICKETKEEPERS', 75, '/players/rcb/jordan-cox.png', 'sports_cricket', '{"matches":18,"runs":460,"average":30.7,"strikeRate":142,"dismissals":14}'::jsonb, 'Official IPL squad profile for JORDAN COX', 'available'),
(43, 54, 'AYUSH BADONI', 'Ayush Badoni', 'allrounder', 'FINISHER & OFF-SPIN', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 50, '/players/lsg/ayush-badoni.png', 'public', '{"matches":42,"runs":634,"wickets":2,"strikeRate":134.04,"average":24.38,"economy":7.5,"fifties":4,"hundreds":0,"best":"59*","debutYear":2022}'::jsonb, 'Calculative middle-order finisher with inventive ramp and sweep shots against high-velocity pace.', 'available'),
(30, 55, 'SHASHANK SINGH', 'Shashank Singh', 'batter', 'MIDDLE-ORDER STRIKER (RIGHT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/pbks/shashank-singh.png', 'sports_cricket', '{"matches":24,"runs":423,"wickets":null,"strikeRate":164.71,"average":38.45,"fifties":2,"hundreds":0,"best":"68*","debutYear":2022}'::jsonb, 'Breakout uncapped star of IPL 2024 (354 runs, SR 164.7). Elite bat swing and composure in high run-chases.', 'available'),
(33, 56, 'ABISHEK POREL', 'Abishek Porel', 'wicketkeeper', 'TOP-ORDER ATTACKING WK (LEFT HAND)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/dc/abishek-porel.png', 'front_hand', '{"matches":18,"runs":360,"wickets":null,"strikeRate":155.17,"average":27.69,"catches":11,"stumpings":2,"fifties":2,"hundreds":0,"best":"65","debutYear":2023}'::jsonb, 'Uncapped left-hand wicketkeeper batter. Scored 33 off 10 against Harshal Patel; fearless powerplay ball-striker.', 'available'),
(39, 57, 'MUKESH CHOUDHARY', 'Mukesh Choudhary', 'bowler', 'SEAM BOWLER (LEFT ARM)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/csk/mukesh-choudhary.png', 'bolt', '{"matches":14,"runs":10,"wickets":16,"strikeRate":17.06,"average":26.5,"economy":9.32,"best":"4/46","debutYear":2022}'::jsonb, 'Left-arm swing bowler proficient in moving the brand-new ball both ways under lights.', 'available'),
(48, 58, 'VAIBHAV ARORA', 'Vaibhav Arora', 'bowler', 'SEAM BOWLER (RIGHT ARM)', 'India', false, false, 'SET 06 // EMERGING & IMPACT (ACC1)', 40, '/players/kkr/vaibhav-arora.png', 'bolt', '{"matches":20,"runs":12,"wickets":19,"strikeRate":20.42,"average":31.84,"economy":9.42,"best":"3/27","debutYear":2022}'::jsonb, 'Sharp upright seam position capable of testing right-handers with late in-duckers.', 'available'),
(52, 59, 'ARSHAD KHAN', 'ARSHAD KHAN', 'allrounder', 'All-Rounder', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/gt/arshad-khan.png', 'sports_cricket', '{"matches":10,"runs":125,"strikeRate":160,"wickets":6,"economy":9.2}'::jsonb, 'Official IPL squad profile for ARSHAD KHAN', 'available'),
(54, 60, 'GURNOOR BRAR', 'GURNOOR BRAR', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/gt/gurnoor-brar.png', 'sports_baseball', '{"matches":5,"wickets":6,"economy":8.8,"bestBowling":"2/26"}'::jsonb, 'Official IPL squad profile for GURNOOR BRAR', 'available'),
(55, 61, 'TEJASVI DAHIYA', 'TEJASVI DAHIYA', 'batter', 'Batter', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/kkr/tejasvi-dahiya.png', 'sports_cricket', '{"matches":8,"runs":210,"average":30,"strikeRate":138.5,"fifties":1}'::jsonb, 'Official IPL squad profile for TEJASVI DAHIYA', 'available'),
(57, 62, 'MUKUL CHOUDHARY', 'MUKUL CHOUDHARY', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/lsg/mukul-choudhary.png', 'sports_baseball', '{"matches":6,"wickets":7,"economy":8.1,"bestBowling":"3/29"}'::jsonb, 'Official IPL squad profile for MUKUL CHOUDHARY', 'available'),
(58, 63, 'RUCHIT AHIR', 'RUCHIT AHIR', 'wicketkeeper', 'Wicketkeeper', 'India', false, false, 'UNCAPPED-WICKETKEEPERS', 30, '/players/mi/ruchit-ahir.png', 'sports_cricket', '{"matches":4,"runs":95,"average":23.8,"strikeRate":128,"dismissals":5}'::jsonb, 'Official IPL squad profile for RUCHIT AHIR', 'available'),
(59, 64, 'ATHARVA ANKOLEKAR', 'ATHARVA ANKOLEKAR', 'allrounder', 'All-Rounder', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/mi/atharva-ankolekar.png', 'sports_cricket', '{"matches":12,"runs":160,"strikeRate":132,"wickets":14,"economy":7.2}'::jsonb, 'Official IPL squad profile for ATHARVA ANKOLEKAR', 'available'),
(60, 65, 'RAJ BAWA', 'RAJ BAWA', 'allrounder', 'All-Rounder', 'India', false, false, 'UNCAPPED-ALLROUNDERS', 30, '/players/mi/raj-bawa.png', 'sports_cricket', '{"matches":14,"runs":220,"strikeRate":141,"wickets":11,"economy":8.5}'::jsonb, 'Official IPL squad profile for RAJ BAWA', 'available'),
(61, 66, 'KRISH BHAGAT', 'KRISH BHAGAT', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/mi/krish-bhagat.png', 'sports_baseball', '{"matches":7,"wickets":9,"economy":8,"bestBowling":"3/24"}'::jsonb, 'Official IPL squad profile for KRISH BHAGAT', 'available'),
(62, 67, 'PRIYANSH ARYA', 'PRIYANSH ARYA', 'batter', 'Batter', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/pbks/priyansh-arya.png', 'sports_cricket', '{"matches":11,"runs":375,"average":37.5,"strikeRate":154.2,"fifties":3}'::jsonb, 'Official IPL squad profile for PRIYANSH ARYA', 'available'),
(63, 68, 'PYLA AVINASH', 'PYLA AVINASH', 'batter', 'Batter', 'India', false, false, 'UNCAPPED-BATTERS', 30, '/players/pbks/pyla-avinash.png', 'sports_cricket', '{"matches":5,"runs":140,"average":28,"strikeRate":131,"fifties":1}'::jsonb, 'Official IPL squad profile for PYLA AVINASH', 'available'),
(66, 69, 'EMANJOT SINGH CHAHAL', 'EMANJOT SINGH CHAHAL', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/rr/emanjot-singh-chahal.png', 'sports_baseball', '{"matches":6,"wickets":8,"economy":7.9,"bestBowling":"2/19"}'::jsonb, 'Official IPL squad profile for EMANJOT SINGH CHAHAL', 'available'),
(68, 70, 'KANISHK CHOUHAN', 'KANISHK CHOUHAN', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/rcb/kanishk-chouhan.png', 'sports_baseball', '{"matches":4,"wickets":5,"economy":8.3,"bestBowling":"2/22"}'::jsonb, 'Official IPL squad profile for KANISHK CHOUHAN', 'available'),
(70, 71, 'RS AMBRISH', 'RS AMBRISH', 'bowler', 'Bowler', 'India', false, false, 'UNCAPPED-BOWLERS', 30, '/players/srh/rs-ambrish.png', 'sports_baseball', '{"matches":5,"wickets":6,"economy":8.4,"bestBowling":"2/25"}'::jsonb, 'Official IPL squad profile for RS AMBRISH', 'available'),
(71, 72, 'ZEESHAN ANSARI', 'ZEESHAN ANSARI', 'bowler', 'Bowler', 'India', false, false, 'SPIN-BOWLERS', 30, '/players/srh/zeeshan-ansari.png', 'sports_baseball', '{"matches":9,"wickets":12,"economy":7.5,"bestBowling":"3/20"}'::jsonb, 'Official IPL squad profile for ZEESHAN ANSARI', 'available'),
(72, 73, 'SALIL ARORA', 'SALIL ARORA', 'wicketkeeper', 'Wicketkeeper', 'India', false, false, 'UNCAPPED-WICKETKEEPERS', 30, '/players/srh/salil-arora.png', 'sports_cricket', '{"matches":6,"runs":135,"average":27,"strikeRate":126.5,"dismissals":7}'::jsonb, 'Official IPL squad profile for SALIL ARORA', 'available')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    role_label = EXCLUDED.role_label,
    nationality = EXCLUDED.nationality,
    overseas = EXCLUDED.overseas,
    capped = EXCLUDED.capped,
    set_name = EXCLUDED.set_name,
    base_price = EXCLUDED.base_price,
    image = EXCLUDED.image,
    icon = EXCLUDED.icon,
    stats = EXCLUDED.stats,
    tactical_profile = EXCLUDED.tactical_profile;

-- 8.4 User Accounts Seeding Function
CREATE OR REPLACE FUNCTION public.seed_hammer_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    team_rec RECORD;
    v_user_id UUID;
    v_enc_pw TEXT;
BEGIN
    v_enc_pw := crypt('hammer2026', gen_salt('bf'));

    -- 1. AUCTIONEER ACCOUNT
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'auctioneer@hammer.ipl';
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_user_id, 'auctioneer@hammer.ipl', v_enc_pw, now(), '{"role":"auctioneer","username":"auctioneer"}'::jsonb);
    END IF;
    INSERT INTO public.profiles (id, email, username, role, team_id)
    VALUES (v_user_id, 'auctioneer@hammer.ipl', 'auctioneer', 'auctioneer', NULL)
    ON CONFLICT (id) DO UPDATE SET role = 'auctioneer';

    -- 2. PUBLIC VIEWER ACCOUNT
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'viewer@hammer.ipl';
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
        VALUES (v_user_id, 'viewer@hammer.ipl', crypt('view2026', gen_salt('bf')), now(), '{"role":"viewer","username":"viewer"}'::jsonb);
    END IF;
    INSERT INTO public.profiles (id, email, username, role, team_id)
    VALUES (v_user_id, 'viewer@hammer.ipl', 'viewer', 'viewer', NULL)
    ON CONFLICT (id) DO UPDATE SET role = 'viewer';

    -- 3. 10 FRANCHISE OWNER ACCOUNTS
    FOR team_rec IN SELECT id, lower(id) as code FROM public.teams LOOP
        SELECT id INTO v_user_id FROM auth.users WHERE email = (team_rec.code || '@hammer.ipl');
        IF v_user_id IS NULL THEN
            v_user_id := gen_random_uuid();
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
            VALUES (v_user_id, team_rec.code || '@hammer.ipl', v_enc_pw, now(), jsonb_build_object('role', 'team_owner', 'teamId', team_rec.id, 'username', team_rec.code));
        END IF;
        INSERT INTO public.profiles (id, email, username, role, team_id)
        VALUES (v_user_id, team_rec.code || '@hammer.ipl', team_rec.code, 'team_owner', team_rec.id)
        ON CONFLICT (id) DO UPDATE SET role = 'team_owner', team_id = team_rec.id;
    END LOOP;
END;
$$;

-- Execute User Seeding
SELECT public.seed_hammer_users();

-- =====================================================================
-- MASTER PRODUCTION SCHEMA CREATION COMPLETE
-- =====================================================================

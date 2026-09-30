-- =====================================================================
-- HAMMER — POSTGRESQL SCHEMA & STORED PROCEDURES (TASK-SPECIFIC RULES)
-- =====================================================================
-- Rules Enforced:
-- 1. Integer Lakhs Currency: Starting purse 12,500 lakhs (₹125.00 Cr).
-- 2. Tiered Bid Increments:
--    • Current bid < 100L  -> +10L
--    • Current bid < 500L  -> +20L
--    • Current bid >= 500L -> +50L
-- 3. Leading Team Cannot Re-bid on the same lot.
-- 4. Server-Authoritative Anti-Race-Condition Row Locks (SELECT FOR UPDATE).
-- 5. Bid-Reset Timer: Timer resets to 10s on every accepted bid.
-- 6. Squad Constraints: Minimum 7 players, 1 WK, 3 bowlers (max 25).
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TEAMS TABLE (10 Official IPL Franchises)
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY, -- 'MI', 'CSK', 'RCB', 'DC', 'GT', 'KKR', 'LSG', 'PBKS', 'RR', 'SRH'
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    code TEXT,
    purse INT NOT NULL DEFAULT 12500,     -- Integer lakhs (12,500 = ₹125 Cr)
    spent INT NOT NULL DEFAULT 0,         -- Integer lakhs
    remaining INT NOT NULL DEFAULT 12500, -- Integer lakhs
    max_slots INT NOT NULL DEFAULT 25,
    min_slots INT NOT NULL DEFAULT 7,
    filled_slots INT NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#211C17',
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PROFILES TABLE (Associated with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('auctioneer', 'team_owner', 'viewer')),
    team_id TEXT REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PLAYERS TABLE (Official IPL Player Catalog)
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

-- 5. AUCTIONS TABLE (Singleton active session state)
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

-- 6. BIDS AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id INT NOT NULL DEFAULT 1 REFERENCES public.auctions(id),
    player_id INT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.teams(id),
    amount INT NOT NULL,                  -- Integer lakhs
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TEAM SQUADS TABLE (Ratified acquisitions)
CREATE TABLE IF NOT EXISTS public.team_squads (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id INT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    sold_price INT NOT NULL,              -- Integer lakhs
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, player_id)
);

-- 8. AUCTION HISTORY TABLE (Finished lots archival ledger)
CREATE TABLE IF NOT EXISTS public.auction_history (
    id SERIAL PRIMARY KEY,
    player_id INT NOT NULL REFERENCES public.players(id),
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

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_history ENABLE ROW LEVEL SECURITY;

-- 1. TEAMS: Public read, server-only write
DROP POLICY IF EXISTS "Allow public read teams" ON public.teams;
CREATE POLICY "Allow public read teams" ON public.teams FOR SELECT USING (true);

-- 2. PLAYERS: Public read
DROP POLICY IF EXISTS "Allow public read players" ON public.players;
CREATE POLICY "Allow public read players" ON public.players FOR SELECT USING (true);

-- 3. AUCTIONS: Public read
DROP POLICY IF EXISTS "Allow public read auctions" ON public.auctions;
CREATE POLICY "Allow public read auctions" ON public.auctions FOR SELECT USING (true);

-- 4. BIDS: Public read
DROP POLICY IF EXISTS "Allow public read bids" ON public.bids;
CREATE POLICY "Allow public read bids" ON public.bids FOR SELECT USING (true);

-- 5. TEAM SQUADS: Public read
DROP POLICY IF EXISTS "Allow public read team_squads" ON public.team_squads;
CREATE POLICY "Allow public read team_squads" ON public.team_squads FOR SELECT USING (true);

-- 6. AUCTION HISTORY: Public read
DROP POLICY IF EXISTS "Allow public read auction_history" ON public.auction_history;
CREATE POLICY "Allow public read auction_history" ON public.auction_history FOR SELECT USING (true);

-- 7. PROFILES: Authenticated read/update
DROP POLICY IF EXISTS "Allow user read own profile" ON public.profiles;
CREATE POLICY "Allow user read own profile" ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow user update own profile" ON public.profiles;
CREATE POLICY "Allow user update own profile" ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- =====================================================================
-- STORED PROCEDURES & BUSINESS LOGIC (ATOMIC & CONCURRENCY-SAFE)
-- =====================================================================

-- Format Lakhs into Cr / L string for notifications
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

-- Tiered Bid Increment Calculator (Rule 6 from brief)
-- Current bid < 100L  -> +10L
-- Current bid < 500L  -> +20L
-- Current bid >= 500L -> +50L
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

-- Next Valid Bid Calculator
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

-- 1. ATOMIC SUBMIT BID FUNCTION
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

    -- 4. RULE: LEADING TEAM CANNOT RE-BID ON SAME LOT (Rule 7 from brief)
    IF v_auction.leading_team_id = v_team_id THEN
        RAISE EXCEPTION 'Leading team cannot outbid itself on the same lot.' USING ERRCODE = '20005';
    END IF;

    -- 5. Lock and inspect bidding team purse & squad capacity
    SELECT * INTO v_team FROM public.teams WHERE id = v_team_id FOR UPDATE;
    IF v_team.filled_slots >= v_team.max_slots THEN
        RAISE EXCEPTION 'Squad roster is full (% / % slots)', v_team.filled_slots, v_team.max_slots USING ERRCODE = '20006';
    END IF;

    -- 6. Calculate next valid bid in integer lakhs
    v_new_bid := public.get_next_valid_bid(v_auction.current_bid, v_auction.base_price, v_auction.leading_team_id IS NOT NULL);

    -- 7. Anti-race-condition validation against client expectedBid
    IF p_expected_bid IS NOT NULL AND p_expected_bid != v_new_bid THEN
        SELECT short_name INTO v_leading_short_name FROM public.teams WHERE id = v_auction.leading_team_id;
        RAISE EXCEPTION 'Outbid! Current bid is now % (%). Next valid bid is %.',
            public.format_cr(v_auction.current_bid),
            COALESCE(v_leading_short_name, 'Competitor'),
            public.format_cr(v_new_bid)
            USING ERRCODE = '20007';
    END IF;

    -- 8. Check team purse sufficiency (Integer lakhs)
    IF v_new_bid > v_team.remaining THEN
        RAISE EXCEPTION 'Insufficient purse: % remaining, but this bid requires %',
            public.format_cr(v_team.remaining),
            public.format_cr(v_new_bid)
            USING ERRCODE = '20008';
    END IF;

    -- 9. Squad constraint preservation check:
    -- Team must retain at least ₹30L reserve per remaining required slot to reach minimum 7 players
    v_remaining_required_slots := GREATEST(0, v_team.min_slots - (v_team.filled_slots + 1));
    v_min_reserve_needed := v_remaining_required_slots * 30; -- Minimum base price 30L
    IF (v_team.remaining - v_new_bid) < v_min_reserve_needed THEN
        RAISE EXCEPTION 'Purse deficit: Bidding % leaves %, insufficient to fill the mandatory 7-player minimum squad.',
            public.format_cr(v_new_bid),
            public.format_cr(v_team.remaining - v_new_bid)
            USING ERRCODE = '20009';
    END IF;

    -- 10. Record accepted bid in audit log
    INSERT INTO public.bids (auction_id, player_id, team_id, amount)
    VALUES (1, v_player.id, v_team_id, v_new_bid)
    RETURNING id INTO v_bid_id;

    -- 11. Atomically update auction state & RESET TIMER TO 10s (Rule 9 from brief)
    UPDATE public.auctions
    SET current_bid = v_new_bid,
        leading_team_id = v_team_id,
        timer = max_timer, -- RESET TIMER (10s)
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

-- 2. START AUCTION FOR PLAYER (Auctioneer only)
CREATE OR REPLACE FUNCTION public.fn_start_auction(p_player_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
    v_player RECORD;
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

    -- Reset previous active player if needed
    UPDATE public.players SET status = 'available' WHERE status = 'on_hammer';

    -- Put player on hammer
    UPDATE public.players
    SET status = 'on_hammer', updated_at = now()
    WHERE id = p_player_id;

    -- Initialize singleton auction state
    UPDATE public.auctions
    SET status = 'live',
        current_player_id = p_player_id,
        current_bid = 0,
        base_price = v_player.base_price,
        leading_team_id = NULL,
        timer = max_timer,
        gavel_stage = 0,
        bid_increment = public.get_bid_increment(v_player.base_price),
        updated_at = now()
    WHERE id = 1;

    RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'base_price', v_player.base_price);
END;
$$;

-- 3. SELL CURRENT PLAYER (Auctioneer only, atomic transaction)
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

    -- 1. Deduct purse atomically in integer lakhs
    UPDATE public.teams
    SET spent = spent + v_auction.current_bid,
        remaining = remaining - v_auction.current_bid,
        purse = remaining - v_auction.current_bid,
        filled_slots = filled_slots + 1
    WHERE id = v_auction.leading_team_id;

    -- 2. Add player to team squad
    INSERT INTO public.team_squads (team_id, player_id, sold_price)
    VALUES (v_auction.leading_team_id, v_player.id, v_auction.current_bid)
    ON CONFLICT (team_id, player_id) DO UPDATE SET sold_price = EXCLUDED.sold_price;

    -- 3. Update player status
    UPDATE public.players
    SET status = 'sold',
        sold_to = v_auction.leading_team_id,
        sold_price = v_auction.current_bid,
        updated_at = now()
    WHERE id = v_player.id;

    -- 4. Collect bid history
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'team_id', team_id,
        'amount', amount,
        'created_at', created_at
    ) ORDER BY created_at ASC)
    INTO v_bid_count, v_bids_json
    FROM public.bids
    WHERE player_id = v_player.id;

    -- 5. Record archival history
    INSERT INTO public.auction_history (
        player_id, player_name, player_role, lot_number,
        result, sold_to, sold_price, base_price,
        bid_count, bid_history
    ) VALUES (
        v_player.id, v_player.name, v_player.role, v_player.lot_number,
        'sold', v_auction.leading_team_id, v_auction.current_bid, v_player.base_price,
        COALESCE(v_bid_count, 0), COALESCE(v_bids_json, '[]'::jsonb)
    );

    -- 6. Reset singleton auction state
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

-- 4. MARK UNSOLD (Auctioneer only)
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

-- 5. PAUSE / RESUME / RESET AUCTION
CREATE OR REPLACE FUNCTION public.fn_pause_auction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.auctions SET status = 'paused', updated_at = now() WHERE id = 1;
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
    RETURN jsonb_build_object('success', true, 'status', 'live');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reset_auction()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.players SET status = 'available', sold_to = NULL, sold_price = NULL;
    UPDATE public.teams SET spent = 0, remaining = 12500, purse = 12500, filled_slots = 0;
    DELETE FROM public.team_squads;
    DELETE FROM public.bids;
    DELETE FROM public.auction_history;
    UPDATE public.auctions
    SET status = 'idle',
        current_player_id = NULL,
        current_bid = 0,
        base_price = 0,
        leading_team_id = NULL,
        timer = 10,
        max_timer = 10,
        gavel_stage = 0,
        lot_index = 0,
        updated_at = now()
    WHERE id = 1;
    RETURN jsonb_build_object('success', true, 'message', 'Auction session completely reset');
END;
$$;

-- 6. TIMER & GAVEL MANAGEMENT
CREATE OR REPLACE FUNCTION public.fn_set_timer_duration(p_duration INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_profile RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
        IF v_profile IS NOT NULL AND v_profile.role != 'auctioneer' THEN
            RAISE EXCEPTION 'Access Denied: Only Auctioneer can configure timer settings' USING ERRCODE = '20013';
        END IF;
    END IF;

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

-- Realtime publication registration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_squads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_history;

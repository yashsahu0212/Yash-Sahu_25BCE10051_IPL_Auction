/**
 * HAMMER — Client-Side Auction Engine
 * Shared library for all pages. Provides dual-backend support:
 * 1. Supabase (Production): PostgreSQL + Supabase Auth + Supabase Realtime + Stored Procedures / Edge Functions
 * 2. Local Node/Socket.IO (Fallback / Offline Development)
 *
 * The existing Stitch design and visual identity is strictly preserved.
 */
(function (window) {
  'use strict';

  // ─── STATE & REFERENCES ──────────────────────────────────
  const API_BASE = '';

  function getCookie(name) {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, val, maxAge = 86400) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(val)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function clearCookie(name) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }

  let _token = null;

  function getToken() {
    if (_token) return _token;
    const ls = localStorage.getItem('hammer_token');
    if (ls && ls !== 'null' && ls !== 'undefined') return ls;
    const ck = getCookie('hammer_token');
    if (ck && ck !== 'null' && ck !== 'undefined') return ck;
    return null;
  }

  _token = getToken();
  let _user = null;
  try {
    const savedUser = localStorage.getItem('hammer_user');
    if (savedUser) _user = JSON.parse(savedUser);
  } catch (e) {}

  let _authState = _user ? 'AUTHENTICATED' : 'AUTH_LOADING'; // 'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  let _authPromise = null;
  let _initPromise = null;
  let _lastAuctionState = null;
  let _socket = null;
  let _supabaseChannel = null;
  let _listeners = {};

  // ─── UTILITIES & DATA MAPPERS ────────────────────────────
  function getBidIncrement(currentBidLakhs) {
    const b = Number(currentBidLakhs || 0);
    if (b < 100) return 10;
    if (b < 500) return 20;
    return 50;
  }

  function getNextValidBid(state) {
    if (!state) return 0;
    if (!state.currentBid || state.currentBid === 0 || !state.leadingTeamId) {
      return state.basePrice || 200;
    }
    const current = Number(state.currentBid);
    return current + getBidIncrement(current);
  }

  function getSquadConstraints(squad = []) {
    const arr = Array.isArray(squad) ? squad : [];
    const total = arr.length;
    const minTotal = 7;
    const maxTotal = 25;
    const wkCount = arr.filter(p => p && p.role === 'wicketkeeper').length;
    const bowlerCount = arr.filter(p => p && p.role === 'bowler').length;
    const allRounderCount = arr.filter(p => p && p.role === 'allrounder').length;
    const batterCount = arr.filter(p => p && p.role === 'batter').length;
    const overseasCount = arr.filter(p => p && p.overseas).length;
    return {
      total,
      minTotal,
      maxTotal,
      wkCount,
      minWk: 1,
      isWkMet: wkCount >= 1,
      bowlerCount,
      minBowlers: 3,
      isBowlersMet: bowlerCount >= 3,
      allRounderCount,
      batterCount,
      overseasCount,
      maxOverseas: 8,
      isComplete: total >= minTotal && wkCount >= 1 && bowlerCount >= 3
    };
  }

  function mapPlayer(p) {
    if (!p) return null;
    return {
      id: p.id,
      lotNumber: p.lot_number || p.lotNumber || p.id,
      name: p.name,
      displayName: p.display_name || p.displayName || p.name,
      role: p.role,
      roleLabel: p.role_label || p.roleLabel || (p.role ? p.role.toUpperCase() : ''),
      nationality: p.nationality || 'India',
      overseas: !!p.overseas,
      capped: p.capped !== false,
      set: p.set_name || p.set || '',
      basePrice: Math.round(Number(p.base_price != null ? p.base_price : p.basePrice || 0)),
      image: p.image || p.imageUrl || p.image_url || (window.getHammerPlayerImage ? window.getHammerPlayerImage(p.name) : null),
      icon: p.icon || (p.role === 'bowler' ? 'bolt' : p.role === 'allrounder' ? 'public' : p.role === 'wicketkeeper' ? 'front_hand' : 'sports_cricket'),
      stats: typeof p.stats === 'string' ? JSON.parse(p.stats) : (p.stats || {}),
      tacticalProfile: p.tactical_profile || p.tacticalProfile,
      status: p.status || 'available',
      soldTo: p.sold_to || p.soldTo,
      soldPrice: (p.sold_price != null || p.soldPrice != null) ? Math.round(Number(p.sold_price ?? p.soldPrice)) : null
    };
  }

  function mapTeam(t, squads = []) {
    if (!t) return null;
    const teamSquad = Array.isArray(t.squad) ? t.squad : (Array.isArray(t.players) ? t.players : squads.filter(s => s.team_id === t.id));
    const overseasCount = teamSquad.filter(s => (s.player?.overseas || s.overseas)).length;
    return {
      id: t.id,
      name: t.name,
      shortName: t.short_name || t.shortName || t.id,
      code: t.code || t.id,
      purse: Math.round(Number(t.initial_purse ?? t.initialPurse ?? t.purse ?? 12500)),
      remaining: Math.round(Number(t.remaining ?? (t.purse - (t.spent || 0)) ?? 12500)),
      spent: Math.round(Number(t.spent ?? 0)),
      color: t.color || '#211C17',
      logo: t.logo_url || t.logo,
      playersCount: teamSquad.length,
      filledSlots: teamSquad.length,
      maxSlots: t.max_slots || t.maxSlots || 25,
      minSlots: t.min_slots || t.minSlots || 7,
      overseasCount: overseasCount,
      squad: teamSquad.map(s => {
        if (s.player) {
          return {
            ...mapPlayer(s.player),
            soldPrice: Math.round(Number(s.sold_price)),
            acquiredAt: s.acquired_at
          };
        }
        return mapPlayer(s);
      })
    };
  }

  function mapAuctionState(a, player, team, bids = []) {
    if (!a) return null;
    const currentBid = Math.round(Number(a.current_bid ?? a.currentBid ?? 0));
    const basePrice = Math.round(Number(a.base_price ?? a.basePrice ?? 0));
    return {
      status: a.status,
      currentPlayer: mapPlayer(player || a.currentPlayer),
      currentBid: currentBid,
      basePrice: basePrice,
      leadingTeamId: a.leading_team_id ?? a.leadingTeamId,
      leadingTeam: team ? {
        id: team.id,
        name: team.name,
        shortName: team.short_name || team.shortName || team.id,
        code: team.code || team.id,
        color: team.color,
        logo: team.logo_url || team.logo
      } : (a.leadingTeam || null),
      round: a.round || 1,
      lotIndex: a.lot_index ?? a.lotIndex ?? 0,
      timer: Number(a.timer ?? 10),
      maxTimer: Number(a.max_timer ?? a.maxTimer ?? 10),
      gavelStage: a.gavel_stage ?? a.gavelStage ?? 0,
      bidIncrement: getBidIncrement(currentBid),
      sessionLabel: a.session_label ?? a.sessionLabel ?? '2026 MEGA AUCTION',
      recentBids: (bids || []).map(b => ({
        id: b.id,
        teamId: b.team_id || b.teamId,
        teamShortName: b.teams?.short_name || b.teamShortName || b.team_id || b.teamId,
        amount: Math.round(Number(b.amount)),
        time: b.created_at || b.time || new Date().toISOString()
      }))
    };
  }

  function isSupabaseMode() {
    return Boolean(
      window.getSupabaseClient &&
      window.SUPABASE_CONFIG &&
      window.SUPABASE_CONFIG.isConfigured()
    );
  }

  // ─── SUPABASE API LAYER ─────────────────────────────────
  const SupabaseAPI = {
    get client() {
      return window.getSupabaseClient ? window.getSupabaseClient() : null;
    },

    async login(username, password) {
      const sb = this.client;
      if (!sb) throw new Error('Supabase client unavailable');

      // Map simple username to email if needed
      const email = username.includes('@') ? username : `${username.toLowerCase()}@hammer.ipl`;

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      // Fetch profile & associated team
      const { data: profile, error: pErr } = await sb
        .from('profiles')
        .select('*, teams(*)')
        .eq('id', data.user.id)
        .single();

      if (pErr) console.warn('Could not fetch user profile:', pErr.message);

      _user = {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username || username,
        role: profile?.role || 'team_owner',
        teamId: profile?.team_id || null,
        team: profile?.teams ? mapTeam(profile.teams) : null
      };

      _token = data.session.access_token;
      localStorage.setItem('hammer_token', _token);
      return { token: _token, user: _user };
    },

    async logout() {
      const sb = this.client;
      if (sb) {
        try { await sb.auth.signOut(); } catch (e) { /* ignore */ }
      }
    },

    async me() {
      const sb = this.client;
      if (!sb) return null;
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;

      const { data: profile } = await sb
        .from('profiles')
        .select('*, teams(*)')
        .eq('id', session.user.id)
        .single();

      _user = {
        id: session.user.id,
        email: session.user.email,
        username: profile?.username || session.user.email?.split('@')[0],
        role: profile?.role || 'viewer',
        teamId: profile?.team_id || null,
        team: profile?.teams ? mapTeam(profile.teams) : null
      };
      _token = session.access_token;
      return { user: _user };
    },

    async getPlayers(params = {}) {
      const sb = this.client;
      let q = sb.from('players').select('*');
      if (params.role && params.role !== 'all') {
        if (params.role === 'overseas') q = q.eq('overseas', true);
        else if (params.role === 'uncapped') q = q.eq('capped', false);
        else q = q.eq('role', params.role);
      }
      if (params.status && params.status !== 'all') q = q.eq('status', params.status);
      if (params.search) q = q.ilike('name', `%${params.search}%`);
      q = q.order('lot_number', { ascending: true });

      const { data, error } = await q;
      if (error) {
        console.error('[Hammer Supabase] Error fetching players:', error);
        throw new Error(error.message);
      }
      const mapped = (data || []).map(mapPlayer);
      return {
        players: mapped,
        total: mapped.length,
        page: params.page || 1,
        totalPages: Math.ceil(mapped.length / (params.limit || 12)) || 1
      };
    },

    async getPlayer(id) {
      const sb = this.client;
      const { data, error } = await sb.from('players').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return mapPlayer(data);
    },

    async getTeams() {
      const sb = this.client;
      const [{ data: teams, error: tErr }, { data: squads, error: sErr }] = await Promise.all([
        sb.from('teams').select('*').order('name'),
        sb.from('team_squads').select('*, players(*)')
      ]);
      if (tErr) throw new Error(tErr.message);
      return (teams || []).map(t => mapTeam(t, squads || []));
    },

    async getTeam(id) {
      const sb = this.client;
      const [{ data: team, error: tErr }, { data: squad, error: sErr }] = await Promise.all([
        sb.from('teams').select('*').eq('id', id).single(),
        sb.from('team_squads').select('*, players(*)').eq('team_id', id)
      ]);
      if (tErr) throw new Error(tErr.message);
      return mapTeam(team, squad || []);
    },

    async getAuctionState() {
      const sb = this.client;
      const { data: auction, error } = await sb.from('auctions').select('*').eq('id', 1).single();
      if (error) throw new Error(error.message);

      let player = null;
      if (auction.current_player_id) {
        const { data: p } = await sb.from('players').select('*').eq('id', auction.current_player_id).single();
        player = p;
      }

      let leadingTeam = null;
      if (auction.leading_team_id) {
        const { data: t } = await sb.from('teams').select('*').eq('id', auction.leading_team_id).single();
        leadingTeam = t;
      }

      const { data: bids } = await sb
        .from('bids')
        .select('*, teams(short_name)')
        .eq('auction_id', 1)
        .order('created_at', { ascending: false })
        .limit(20);

      return mapAuctionState(auction, player, leadingTeam, bids || []);
    },

    async getAuctionHistory() {
      const sb = this.client;
      const { data, error } = await sb
        .from('auction_history')
        .select('*, teams(id, name, short_name, code, color, logo_url)')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []).map(h => ({
        id: h.id,
        playerId: h.player_id,
        playerName: h.player_name,
        playerRole: h.player_role,
        lotNumber: h.lot_number,
        result: h.result,
        soldTo: h.sold_to,
        team: h.teams ? {
          id: h.teams.id,
          name: h.teams.name,
          shortName: h.teams.short_name,
          color: h.teams.color,
          logo: h.teams.logo_url
        } : null,
        soldPrice: h.sold_price != null ? Number(h.sold_price) : null,
        basePrice: Number(h.base_price),
        bidCount: h.bid_count,
        bidHistory: typeof h.bid_history === 'string' ? JSON.parse(h.bid_history) : (h.bid_history || []),
        timestamp: h.created_at
      }));
    },

    async getActivityLog(params = {}) {
      const sb = this.client;
      let query = sb
        .from('auction_events')
        .select('*')
        .order('event_sequence', { ascending: false });

      if (params.type && params.type !== 'all') {
        const t = params.type.toUpperCase();
        if (t === 'BIDS') {
          query = query.in('event_type', ['BID_PLACED', 'BID_REJECTED']);
        } else if (t === 'LOTS') {
          query = query.like('event_type', 'LOT_%');
        } else if (t === 'HAMMER' || t === 'SOLD') {
          query = query.in('event_type', ['LOT_SOLD', 'LOT_UNSOLD']);
        } else if (t === 'SYSTEM') {
          query = query.in('event_type', ['AUCTION_STARTED', 'AUCTION_PAUSED', 'AUCTION_RESUMED', 'AUCTION_RESET', 'TIMER_CHANGED']);
        } else {
          query = query.eq('event_type', t);
        }
      }
      if (params.lot_id) {
        query = query.eq('lot_id', params.lot_id);
      }
      if (params.player_id) {
        query = query.eq('player_id', params.player_id);
      }
      if (params.team_id) {
        query = query.eq('actor_team_id', params.team_id.toUpperCase());
      }
      const limit = params.limit || 100;
      query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return {
        events: data || [],
        total: (data || []).length,
        latestSequence: data && data.length > 0 ? (data[0].event_sequence || 0) : 0
      };
    },

    // ── Atomic Stored Procedures (Edge Functions / RPC) ──
    async placeBid(expectedBid) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_place_bid', { p_expected_bid: expectedBid });
      if (error) throw new Error(error.message);
      return data;
    },

    async startAuction(playerId) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_start_auction', { p_player_id: playerId });
      if (error) throw new Error(error.message);
      return data;
    },

    async markSold() {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_sell_player');
      if (error) throw new Error(error.message);
      return data;
    },

    async markUnsold() {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_unsold_player');
      if (error) throw new Error(error.message);
      return data;
    },

    async pauseAuction() {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_pause_auction');
      if (error) throw new Error(error.message);
      return data;
    },

    async resumeAuction() {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_resume_auction');
      if (error) throw new Error(error.message);
      return data;
    },

    async resetAuction() {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_reset_auction');
      if (error) throw new Error(error.message);
      return data;
    },

    async addTimer(seconds = 10) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_add_timer', { p_seconds: seconds });
      if (error) throw new Error(error.message);
      return data;
    },

    async resetTimer(seconds = 10) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_reset_timer', { p_seconds: seconds });
      if (error) {
        await sb.from('auctions').update({ timer: seconds }).eq('id', 1);
        return { success: true, timer: seconds };
      }
      return data;
    },

    async setGavel(stage) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_set_gavel', { p_stage: stage });
      if (error) throw new Error(error.message);
      return data;
    },

    async setTimerDuration(duration = 15) {
      const sb = this.client;
      const { data, error } = await sb.rpc('fn_set_timer_duration', { p_duration: Number(duration) });
      if (error) {
        await sb.from('auctions').update({ max_timer: Number(duration) }).eq('id', 1);
        return { success: true, maxTimer: Number(duration) };
      }
      return data;
    }
  };

  // ─── LOCAL NODE / REST API (FALLBACK) ───────────────────
  const LocalAPI = {
    async _fetch(method, url, body) {
      const activeToken = getToken();
      const opts = {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      };
      if (activeToken) opts.headers['Authorization'] = `Bearer ${activeToken}`;
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(API_BASE + url, opts);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'Request failed');
        err.status = res.status;
        throw err;
      }
      return data;
    },

    login(username, password) { return this._fetch('POST', '/api/auth/login', { username, password }); },
    logout() { return this._fetch('POST', '/api/auth/logout'); },
    me() { return this._fetch('GET', '/api/auth/me'); },

    async getPlayers(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const res = await this._fetch('GET', `/api/players${qs ? '?' + qs : ''}`);
      if (res && Array.isArray(res.players)) {
        return {
          ...res,
          players: res.players.map(mapPlayer)
        };
      }
      if (Array.isArray(res)) {
        const mapped = res.map(mapPlayer);
        return {
          players: mapped,
          total: mapped.length,
          page: params.page || 1,
          totalPages: Math.ceil(mapped.length / (params.limit || 12)) || 1
        };
      }
      return res;
    },
    getPlayer(id) { return this._fetch('GET', `/api/players/${id}`).then(mapPlayer); },

    getTeams() { return this._fetch('GET', '/api/teams'); },
    getTeam(id) { return this._fetch('GET', `/api/teams/${id}`); },

    async getAuctionState() {
      const state = await this._fetch('GET', '/api/auction/state');
      if (state && state.currentPlayer) {
        state.currentPlayer = mapPlayer(state.currentPlayer);
      }
      return state;
    },
    getAuctionHistory() { return this._fetch('GET', '/api/auction/history'); },
    getActivityLog(params = {}) {
      const qs = new URLSearchParams();
      if (params.type) qs.set('type', params.type);
      if (params.lot_id) qs.set('lot_id', params.lot_id);
      if (params.player_id) qs.set('player_id', params.player_id);
      if (params.team_id) qs.set('team_id', params.team_id);
      if (params.limit) qs.set('limit', params.limit);
      if (params.page) qs.set('page', params.page);
      const queryStr = qs.toString() ? `?${qs.toString()}` : '';
      return this._fetch('GET', `/api/auction/activity${queryStr}`);
    },
    getExportUrl(type = 'squads', format = 'csv', id = null) {
      if (type === 'lot' && id) {
        return `/api/export/lot/${encodeURIComponent(id)}?format=${format}`;
      }
      return `/api/export/${type}?format=${format}`;
    },
    startAuction(playerId) { return this._fetch('POST', '/api/auction/start', { playerId }); },
    placeBid(expectedBid) { return this._fetch('POST', '/api/auction/bid', { expectedBid }); },
    setTimerDuration(duration) { return this._fetch('POST', '/api/auction/timer/settings', { duration }); },
    addTimer(seconds = 10) { return this._fetch('POST', '/api/auction/timer/add', { seconds }); },
    resetTimer(seconds) { return this._fetch('POST', '/api/auction/timer/reset', { seconds }); },
    setGavel(stage) { return this._fetch('POST', '/api/auction/gavel', { stage }); },
    markSold() { return this._fetch('POST', '/api/auction/sold'); },
    markUnsold() { return this._fetch('POST', '/api/auction/unsold'); },
    pauseAuction() { return this._fetch('POST', '/api/auction/pause'); },
    resumeAuction() { return this._fetch('POST', '/api/auction/resume'); },
    resetAuction() { return this._fetch('POST', '/api/auction/reset'); }
  };

  // ─── UNIFIED API PROXY ──────────────────────────────────
  // Transparently delegates to Supabase when active, or Local Node server as fallback.
  const API = new Proxy({}, {
    get(target, prop) {
      if (isSupabaseMode() && prop in SupabaseAPI) {
        return SupabaseAPI[prop].bind(SupabaseAPI);
      }
      return LocalAPI[prop] ? LocalAPI[prop].bind(LocalAPI) : undefined;
    }
  });

  // ─── REALTIME CONNECTIONS ───────────────────────────────
  let _connectionStatus = 'offline';

  function connectRealtime() {
    if (isSupabaseMode()) {
      connectSupabaseRealtime();
    } else {
      connectSocketIO();
    }
  }

  function connectSupabaseRealtime() {
    const sb = SupabaseAPI.client;
    if (!sb || _supabaseChannel) return;

    _supabaseChannel = sb.channel('hammer-auction-live')
      // 1. Live changes to auction singleton
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, async (payload) => {
        try {
          const state = await SupabaseAPI.getAuctionState();
          emit('auction:state', state);
        } catch (e) { console.error('Failed to sync auction state:', e); }
      })
      // 2. Live incoming bids
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, async (payload) => {
        try {
          const state = await SupabaseAPI.getAuctionState();
          emit('auction:bid', {
            bid: {
              id: payload.new.id,
              teamId: payload.new.team_id,
              amount: Number(payload.new.amount),
              time: payload.new.created_at
            },
            state: state
          });
        } catch (e) { console.error('Failed to process bid realtime:', e); }
      })
      // 2b. Authoritative auction events stream
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_events' }, (payload) => {
        if (payload.new) {
          emit('auction:event', payload.new);
          emit('activity_created', payload.new);
        }
      })
      // 3. Team purse / squad updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, async () => {
        try {
          const teams = await SupabaseAPI.getTeams();
          emit('teams:update', teams);
        } catch (e) { /* ignore */ }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_squads' }, async () => {
        try {
          const teams = await SupabaseAPI.getTeams();
          emit('teams:update', teams);
        } catch (e) { /* ignore */ }
      })
      // 4. Realtime broadcast channel for instant client sync
      .on('broadcast', { event: 'auction:state' }, (msg) => emit('auction:state', msg.payload))
      .on('broadcast', { event: 'auction:started' }, (msg) => emit('auction:started', msg.payload))
      .on('broadcast', { event: 'auction:bid' }, (msg) => emit('auction:bid', msg.payload))
      .on('broadcast', { event: 'auction:sold' }, (msg) => emit('auction:sold', msg.payload))
      .on('broadcast', { event: 'auction:unsold' }, (msg) => emit('auction:unsold', msg.payload))
      .on('broadcast', { event: 'auction:timer' }, (msg) => emit('auction:timer', msg.payload))
      .on('broadcast', { event: 'auction:timer_settings' }, (msg) => emit('auction:timer_settings', msg.payload))
      .on('broadcast', { event: 'auction:paused' }, (msg) => emit('auction:paused', msg.payload))
      .on('broadcast', { event: 'auction:resumed' }, (msg) => emit('auction:resumed', msg.payload))
      .on('broadcast', { event: 'auction:reset' }, (msg) => emit('auction:reset', msg.payload))
      .on('broadcast', { event: 'activity_created' }, (msg) => {
        emit('auction:event', msg.payload);
        emit('activity_created', msg.payload);
      })
      .on('broadcast', { event: 'auction:event' }, (msg) => {
        emit('auction:event', msg.payload);
        emit('activity_created', msg.payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          _connectionStatus = 'connected';
          emit('connected', { mode: 'supabase' });
        } else if (status === 'CLOSED') {
          _connectionStatus = 'disconnected';
          emit('disconnected', { mode: 'supabase' });
        } else if (status === 'CHANNEL_ERROR') {
          _connectionStatus = 'reconnecting';
          emit('reconnecting', { mode: 'supabase' });
        }
      });
  }

  function broadcastRealtime(event, payload) {
    if (isSupabaseMode() && _supabaseChannel) {
      _supabaseChannel.send({
        type: 'broadcast',
        event: event,
        payload: payload
      });
    }
  }

  function connectSocketIO() {
    if (typeof io === 'undefined') return;
    const token = getToken();

    if (_socket) {
      if (_socket.connected) {
        if (token) _socket.emit('auth', { token });
        return;
      }
      _socket.connect();
      return;
    }

    _socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 400,
      reconnectionDelayMax: 1500,
      timeout: 10000
    });

    const events = [
      'auction:state', 'auction:started', 'auction:bid', 'auction:sold',
      'auction:unsold', 'auction:timer', 'auction:timer_settings', 'auction:paused', 'auction:resumed',
      'auction:reset', 'auction:hammer_ready', 'auction:event', 'activity_created', 'teams:update', 'error'
    ];

    events.forEach(event => {
      _socket.on(event, (data) => emit(event, data));
    });

    _socket.on('connect', () => {
      _connectionStatus = 'connected';
      if (token) _socket.emit('auth', { token });
      emit('connected', { mode: 'socket' });
      // Immediately pull fresh state to guarantee zero desync across all clients
      API.getAuctionState().then(state => {
        if (state) emit('auction:state', state);
      }).catch(() => {});
    });

    _socket.on('reconnect', () => {
      _connectionStatus = 'connected';
      if (token) _socket.emit('auth', { token });
      emit('connected', { mode: 'socket' });
      API.getAuctionState().then(state => {
        if (state) emit('auction:state', state);
      }).catch(() => {});
    });

    _socket.on('reconnect_attempt', () => {
      _connectionStatus = 'reconnecting';
      emit('reconnecting', { mode: 'socket' });
    });

    _socket.on('reconnecting', () => {
      _connectionStatus = 'reconnecting';
      emit('reconnecting', { mode: 'socket' });
    });

    _socket.on('disconnect', () => {
      _connectionStatus = 'disconnected';
      emit('disconnected', { mode: 'socket' });
    });

    _socket.on('connect_error', () => {
      _connectionStatus = 'reconnecting';
      emit('reconnecting', { mode: 'socket' });
    });
  }

  async function socketBid(expectedBid) {
    if (isSupabaseMode()) {
      return API.placeBid(expectedBid);
    }
    return new Promise((resolve, reject) => {
      if (!_socket || !_socket.connected) {
        return API.placeBid(expectedBid).then(resolve).catch(reject);
      }
      _socket.emit('bid', { expectedBid }, (response) => {
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ─── EVENT BUS ──────────────────────────────────────────
  let _lastProcessedSequence = 0;
  const _processedEventIds = new Set();

  function isDuplicateEvent(data) {
    if (!data) return false;
    if (data.id && _processedEventIds.has(data.id)) return true;
    if (data.event_sequence && data.event_sequence <= _lastProcessedSequence) return true;
    if (data.id) {
      _processedEventIds.add(data.id);
      if (_processedEventIds.size > 2000) {
        const first = _processedEventIds.values().next().value;
        _processedEventIds.delete(first);
      }
    }
    if (data.event_sequence && data.event_sequence > _lastProcessedSequence) {
      _lastProcessedSequence = data.event_sequence;
    }
    return false;
  }

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (event === 'auction:event' || event === 'activity_created') {
      if (isDuplicateEvent(data)) return;
    }

    if (event === 'auction:state' || event === 'auction:started' || event === 'auction:paused' || event === 'auction:resumed') {
      _lastAuctionState = data;
    } else if (event === 'auction:bid' && data?.state) {
      _lastAuctionState = data.state;
    } else if ((event === 'auction:sold' || event === 'auction:unsold') && data?.state) {
      _lastAuctionState = data.state;
    } else if (event === 'auction:timer' && _lastAuctionState) {
      _lastAuctionState.timer = data.timer;
      if (data.maxTimer !== undefined) _lastAuctionState.maxTimer = data.maxTimer;
      if (data.gavelStage !== undefined) _lastAuctionState.gavelStage = data.gavelStage;
    } else if (event === 'auction:timer_settings' && _lastAuctionState) {
      if (data.maxTimer !== undefined) _lastAuctionState.maxTimer = data.maxTimer;
      if (data.timer !== undefined) _lastAuctionState.timer = data.timer;
    }

    // Authoritative audio triggering with duplicate prevention
    if (window.HammerUX) {
      try {
        if (event === 'auction:timer') {
          HammerUX.handleTimerTick(data.timer, _lastAuctionState?.status || 'live');
        } else if (event === 'auction:sold') {
          HammerUX.handleAuctionSold(data);
        } else if (event === 'auction:unsold') {
          HammerUX.handleAuctionUnsold(data);
        } else if (event === 'auction:bid') {
          HammerUX.handleAuctionBid(data);
        } else if (event === 'auction:paused') {
          HammerUX.handleAuctionPause();
        } else if (event === 'auction:reset') {
          HammerUX.handleAuctionReset();
        }
      } catch (e) {
        console.warn('Audio handler error:', e);
      }
    }

    if (_listeners[event]) {
      _listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Hammer event error [${event}]:`, e); }
      });
    }
  }

  // ─── AUTHENTICATION ─────────────────────────────────────
  async function login(username, password) {
    const result = await API.login(username, password);
    _token = result.token;
    _user = {
      id: result.user.userId || result.user.id,
      userId: result.user.userId || result.user.id,
      username: result.user.username,
      role: result.user.role,
      teamId: result.user.teamId,
      team: result.team || (result.user.teamId ? { id: result.user.teamId } : null)
    };
    _authState = 'AUTHENTICATED';
    localStorage.setItem('hammer_token', _token);
    localStorage.setItem('hammer_user', JSON.stringify(_user));
    setCookie('hammer_token', _token);
    connectRealtime();
    emit('auth:change', { state: _authState, user: _user });
    return result;
  }

  async function logout() {
    try { await API.logout(); } catch (e) { /* ignore */ }
    _token = null;
    _user = null;
    _authState = 'UNAUTHENTICATED';
    localStorage.removeItem('hammer_token');
    localStorage.removeItem('hammer_user');
    clearCookie('hammer_token');
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
    if (_supabaseChannel) {
      _supabaseChannel.unsubscribe();
      _supabaseChannel = null;
    }
    emit('auth:change', { state: _authState, user: null });
    window.location.href = '/login.html';
  }

  async function checkAuth(forceRefresh = false) {
    if (_authPromise && !forceRefresh) {
      return _authPromise;
    }

    _authPromise = (async () => {
      const activeToken = getToken();

      if (isSupabaseMode()) {
        try {
          const result = await SupabaseAPI.me();
          if (result && result.user) {
            _user = result.user;
            _token = result.token || activeToken;
            _authState = 'AUTHENTICATED';
            localStorage.setItem('hammer_user', JSON.stringify(_user));
            if (_token) {
              localStorage.setItem('hammer_token', _token);
              setCookie('hammer_token', _token);
            }
            emit('auth:change', { state: _authState, user: _user });
            return result;
          }
        } catch (e) {
          console.warn('Supabase auth check error:', e);
        }
        _user = null;
        _token = null;
        _authState = 'UNAUTHENTICATED';
        localStorage.removeItem('hammer_user');
        localStorage.removeItem('hammer_token');
        clearCookie('hammer_token');
        emit('auth:change', { state: _authState, user: null });
        return null;
      }

      if (!activeToken) {
        _user = null;
        _token = null;
        _authState = 'UNAUTHENTICATED';
        localStorage.removeItem('hammer_user');
        localStorage.removeItem('hammer_token');
        clearCookie('hammer_token');
        emit('auth:change', { state: _authState, user: null });
        return null;
      }

      _token = activeToken;
      localStorage.setItem('hammer_token', _token);
      setCookie('hammer_token', _token);

      try {
        const result = await LocalAPI.me();
        if (result && result.user) {
          _user = {
            id: result.user.userId || result.user.id,
            userId: result.user.userId || result.user.id,
            username: result.user.username,
            role: result.user.role,
            teamId: result.user.teamId,
            team: result.team || (result.user.teamId ? { id: result.user.teamId } : null)
          };
          _authState = 'AUTHENTICATED';
          localStorage.setItem('hammer_user', JSON.stringify(_user));
          setCookie('hammer_token', _token);
          emit('auth:change', { state: _authState, user: _user });
          return { user: _user, team: result.team };
        } else {
          throw new Error('Invalid user payload');
        }
      } catch (e) {
        // ONLY invalidate session if server returned definitive 401 Unauthorized
        if (e.status === 401 || (e.message && e.message.toLowerCase().includes('authenticated')) || (e.message && e.message.toLowerCase().includes('authentication required'))) {
          _user = null;
          _token = null;
          _authState = 'UNAUTHENTICATED';
          localStorage.removeItem('hammer_token');
          localStorage.removeItem('hammer_user');
          clearCookie('hammer_token');
          emit('auth:change', { state: _authState, user: null });
          return null;
        }

        // For network or transient server errors, preserve existing user credentials to prevent redirect loops
        console.warn('Auth check transient issue (preserved session):', e.message);
        if (_user) {
          _authState = 'AUTHENTICATED';
          return { user: _user, team: _user.team };
        }
        _authState = 'UNAUTHENTICATED';
        return null;
      }
    })();

    const res = await _authPromise;
    _authPromise = null;
    return res;
  }

  function getUser() { return _user; }
  function getAuthState() { return _authState; }
  function isLoggedIn() { return _authState === 'AUTHENTICATED' && !!_user; }

  // ─── UI UTILITIES ───────────────────────────────────────
  function formatCurrency(val) {
    if (val == null) return '—';
    const lakhs = Math.round(Number(val));
    if (isNaN(lakhs)) return '—';
    if (lakhs >= 100) {
      const cr = (lakhs / 100).toFixed(2);
      return `₹${cr} CR`;
    }
    return `₹${lakhs} L`;
  }

  function formatTimer(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function getGavelLabel(stage) {
    switch (stage) {
      case 0: return 'ACTIVE BIDDING';
      case 1: return '1ST CALL // COUNTER ADVANCE';
      case 2: return '2ND CALL // HAMMER IMMINENT';
      case 3: return 'FINAL CALL // HAMMER DOWN';
      default: return 'AWAITING LOT';
    }
  }

  function getRoleIcon(role) {
    switch (role) {
      case 'batter': return 'sports_cricket';
      case 'bowler': return 'bolt';
      case 'allrounder': return 'public';
      case 'wicketkeeper': return 'front_hand';
      default: return 'person';
    }
  }

  function getRoleLabel(role) {
    switch (role) {
      case 'batter': return 'BATTER';
      case 'bowler': return 'BOWLER';
      case 'allrounder': return 'ALL-ROUNDER';
      case 'wicketkeeper': return 'WICKETKEEPER';
      default: return role?.toUpperCase() || 'UNKNOWN';
    }
  }

  function getStatusBadge(status, soldTo) {
    switch (status) {
      case 'available': return { text: 'AVAILABLE', cls: 'bg-auction-red text-paper-card' };
      case 'on_hammer': return { text: 'ON HAMMER', cls: 'bg-paper-dim text-auction-red border border-auction-red' };
      case 'sold': return { text: `SOLD — ${soldTo || ''}`, cls: 'bg-paper-panel text-auction-red border border-border-parchment' };
      case 'unsold': return { text: 'UNSOLD', cls: 'bg-paper-panel text-ink-secondary border border-border-parchment' };
      default: return { text: status?.toUpperCase() || '', cls: '' };
    }
  }

  function startClock(elementId) {
    function update() {
      const el = document.getElementById(elementId);
      if (!el) return;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      el.textContent = `${h}:${m}:${s} IST`;
    }
    update();
    setInterval(update, 1000);
  }

  function updateNav(activePath) {
    document.querySelectorAll('nav a[data-path]').forEach(link => {
      const isActive = link.getAttribute('data-path') === activePath;
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function showToast(message, type = 'info') {
    let container = document.getElementById('hammer-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hammer-toast-container';
      container.style.cssText = 'position:fixed;top:80px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(container);
    }

    const colors = {
      info: 'border-l-[3px] border-l-[#765D49]',
      success: 'border-l-[3px] border-l-[#4a7c59]',
      error: 'border-l-[3px] border-l-[#8F302F]',
      bid: 'border-l-[3px] border-l-[#8F302F]'
    };

    const toast = document.createElement('div');
    toast.className = `bg-[#F7F1E6] border border-[#C9BBA8] ${colors[type] || colors.info} px-4 py-3 font-mono text-[12px] text-[#211C17] tracking-wider uppercase shadow-sm max-w-sm`;
    toast.style.cssText = 'animation:slideIn 0.3s ease;';
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  if (!document.getElementById('hammer-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'hammer-toast-styles';
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  // ─── INITIALIZATION ─────────────────────────────────────
  async function init() {
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      startClock('clock-tick');
      await checkAuth();
      connectRealtime();
      updatePersonIcon();
      renderBackendBadge();
      return { user: _user, authState: _authState };
    })();

    return _initPromise;
  }

  function renderBackendBadge() {
    // Subtle backend telemetry indicator
    const headerRight = document.querySelector('header .flex.items-center.space-x-3');
    if (headerRight && !document.getElementById('hammer-backend-pill')) {
      const pill = document.createElement('div');
      pill.id = 'hammer-backend-pill';
      pill.className = 'hidden sm:flex items-center px-2 py-1 border border-paper-rule bg-paper-card font-mono text-[9px] tracking-widest uppercase cursor-pointer hover:bg-paper-dim transition-colors';
      pill.title = 'Click to view backend architecture & connection settings';
      const isSb = isSupabaseMode();
      pill.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-none ${isSb ? 'bg-[#3ECF8E]' : 'bg-auction-red'} mr-1.5"></span>
        <span class="text-ink-secondary">${isSb ? 'SUPABASE' : 'STANDBY'}</span>
      `;
      pill.addEventListener('click', showBackendSettingsModal);
      headerRight.insertBefore(pill, headerRight.firstChild);
    }
  }

  function showBackendSettingsModal() {
    let modal = document.getElementById('hammer-settings-modal');
    if (modal) { modal.remove(); }

    const isSb = isSupabaseMode();
    const currUrl = window.SUPABASE_CONFIG?.url || '';
    const currKey = window.SUPABASE_CONFIG?.anonKey || '';

    modal = document.createElement('div');
    modal.id = 'hammer-settings-modal';
    modal.className = 'fixed inset-0 z-50 bg-[#211C17]/60 flex items-center justify-center p-4 backdrop-blur-xs';
    modal.innerHTML = `
      <div class="bg-[#F7F1E6] border border-[#C9BBA8] max-w-lg w-full p-6 font-mono text-ink-primary shadow-xl">
        <div class="flex items-center justify-between pb-3 border-b border-[#C9BBA8] mb-4">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 ${isSb ? 'bg-[#3ECF8E]' : 'bg-[#8F302F]'}"></span>
            <span class="font-bold text-[13px] tracking-wider uppercase">HAMMER ARCHITECTURE TELEMETRY</span>
          </div>
          <button id="modal-close-btn" class="text-ink-secondary hover:text-ink-primary text-sm font-bold">✕</button>
        </div>
        <p class="text-[11px] text-ink-secondary leading-relaxed mb-4">
          Production Architecture: <strong>Supabase (PostgreSQL + RLS + Auth + Realtime + Edge Functions)</strong>.<br>
          Zero separate production Express server required.
        </p>
        <div class="space-y-3 mb-5">
          <div>
            <label class="block text-[10px] text-ink-secondary uppercase tracking-widest mb-1">SUPABASE URL</label>
            <input id="modal-sb-url" type="text" value="${currUrl.includes('your-project-id') ? '' : currUrl}" placeholder="https://your-project.supabase.co" class="w-full bg-[#F3EBDD] border border-[#C9BBA8] px-3 py-1.5 text-[11px] focus:outline-none focus:border-[#8F302F]">
          </div>
          <div>
            <label class="block text-[10px] text-ink-secondary uppercase tracking-widest mb-1">SUPABASE ANON KEY (PUBLISHABLE)</label>
            <input id="modal-sb-key" type="password" value="${currKey.includes('dummy') ? '' : currKey}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="w-full bg-[#F3EBDD] border border-[#C9BBA8] px-3 py-1.5 text-[11px] focus:outline-none focus:border-[#8F302F]">
          </div>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-[#C9BBA8]">
          <span class="text-[10px] text-ink-secondary uppercase tracking-widest">STATE: ${isSb ? '<strong class="text-[#3ECF8E]">CONNECTED</strong>' : '<span class="text-[#8F302F]">FALLBACK ENGINE</span>'}</span>
          <div class="flex gap-2">
            <button id="modal-save-btn" class="bg-[#8F302F] text-[#F7F1E6] px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">SAVE & CONNECT</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-close-btn').addEventListener('click', () => modal.remove());
    document.getElementById('modal-save-btn').addEventListener('click', () => {
      const url = document.getElementById('modal-sb-url').value.trim();
      const key = document.getElementById('modal-sb-key').value.trim();
      if (url && key && window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG.setCredentials(url, key);
        showToast('Supabase Credentials Saved. Reloading...', 'success');
        setTimeout(() => window.location.reload(), 800);
      } else {
        showToast('Please enter both Supabase URL and Anon Key', 'error');
      }
    });
  }

  function updatePersonIcon() {
    const personIcons = document.querySelectorAll('.material-symbols-outlined');
    personIcons.forEach(icon => {
      const text = icon.textContent.trim();
      if (text === 'person' || text === 'account_circle') {
        const btn = icon.closest('a') || icon.closest('button') || icon.closest('div') || icon.parentElement;
        if (btn && !btn._hammerBound) {
          btn._hammerBound = true;
          btn.style.cursor = 'pointer';
          btn.addEventListener('click', (e) => {
            if (isLoggedIn()) {
              e.preventDefault();
              if (_user && _user.role === 'auctioneer') {
                window.location.href = '/auction-desk.html';
              } else if (_user && _user.role === 'team_owner') {
                window.location.href = '/team-console.html';
              } else {
                window.location.href = '/login.html';
              }
            }
          });
        }
      }
    });
  }

  // ─── EXPOSE GLOBAL API ──────────────────────────────────
  window.Hammer = {
    API,
    init,
    login,
    logout,
    checkAuth,
    getUser,
    getAuthState,
    getSession: () => _user,
    getToken,
    isLoggedIn,
    isSupabaseMode,
    on,
    off,
    emit,
    connectRealtime,
    broadcastRealtime,
    socketBid,
    placeBid: (expectedBid) => API.placeBid(expectedBid),
    getPlayers: (params) => API.getPlayers(params),
    getPlayer: (id) => API.getPlayer(id),
    getTeams: () => API.getTeams(),
    getTeam: (id) => API.getTeam(id),
    getAuctionState: async () => {
      const s = await API.getAuctionState();
      _lastAuctionState = s;
      return s;
    },
    getAuctionHistory: () => API.getAuctionHistory(),
    getActivityLog: (params) => API.getActivityLog(params),
    getExportUrl: (type, format, id) => API.getExportUrl ? API.getExportUrl(type, format, id) : `/api/export/${type || 'squads'}?format=${format || 'csv'}`,
    getConnectionState: () => _connectionStatus,
    startAuction: (playerId) => API.startAuction(playerId),
    sellPlayer: () => API.markSold(),
    unsoldPlayer: () => API.markUnsold(),
    pauseAuction: () => API.pauseAuction(),
    resumeAuction: () => API.resumeAuction(),
    resetAuction: () => API.resetAuction(),
    addTimer: (sec) => API.addTimer(sec),
    resetTimer: (sec) => API.resetTimer(sec),
    setTimerDuration: (dur) => API.setTimerDuration(dur),
    setGavelStage: (stage) => API.setGavel(stage),
    getState: () => _lastAuctionState,
    getBidIncrement,
    getNextValidBid,
    getSquadConstraints,
    formatCurrency,
    formatTimer,
    getGavelLabel,
    getRoleIcon,
    getRoleLabel,
    getStatusBadge,
    startClock,
    updateNav,
    showToast
  };

})(window);

/**
 * HAMMER — Realtime Cricket Auction Platform
 * Server-Authoritative Supabase Database Service
 * 
 * Synchronizes in-memory auction events, bids, lot resolutions, and squad data
 * to PostgreSQL / Supabase in the background with zero lag to websocket broadcast.
 */

'use strict';

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class SupabaseService {
  constructor() {
    this.url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null;
    this.serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
    this.anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || null;
    this.client = null;
    this.isConnected = false;
    this.lastError = null;
    this.lastSyncTime = null;
    this._timerDebounce = null;

    this.init();
  }

  isConfigured() {
    return Boolean(
      this.url &&
      this.url.startsWith('https://') &&
      !this.url.includes('your-project-id') &&
      (this.serviceKey || this.anonKey) &&
      !(this.serviceKey || this.anonKey).includes('dummy')
    );
  }

  init() {
    if (!this.isConfigured()) {
      return;
    }

    const key = this.serviceKey || this.anonKey;
    try {
      this.client = createClient(this.url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      this.testConnection();
    } catch (err) {
      this.lastError = err.message;
      console.warn('[SUPABASE SERVICE] Initialization warning:', err.message);
    }
  }

  async testConnection() {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client
        .from('auctions')
        .select('id, status')
        .eq('id', 1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        this.isConnected = false;
        this.lastError = error.message;
        console.warn('[SUPABASE SERVICE] Connection test failed:', error.message);
        return false;
      }

      this.isConnected = true;
      this.lastError = null;
      this.lastSyncTime = new Date().toISOString();
      console.log(`[SUPABASE SERVICE] ✓ Connected to cloud database at ${this.url}`);

      // Verify and auto-seed if database is empty
      this.ensureInitialData();
      return true;
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return false;
    }
  }

  async ensureInitialData() {
    if (!this.isConnected || !this.client) return;

    try {
      // Check if players are present
      const { count, error } = await this.client
        .from('players')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.warn('[SUPABASE SERVICE] Could not inspect players count:', error.message);
        return;
      }

      if (count === 0) {
        console.log('[SUPABASE SERVICE] Database is empty. Seeding teams and 73 players into Supabase...');
        await this.seedFromLocalFiles();
      } else {
        console.log(`[SUPABASE SERVICE] Database populated with ${count} players.`);
      }
    } catch (err) {
      console.warn('[SUPABASE SERVICE] Auto-seed check error:', err.message);
    }
  }

  async seedFromLocalFiles() {
    if (!this.client) return;

    try {
      const teamsPath = path.join(__dirname, '..', 'data', 'teams.json');
      const playersPath = path.join(__dirname, '..', 'data', 'players.json');

      if (fs.existsSync(teamsPath)) {
        const teams = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
        const teamsData = teams.map(t => ({
          id: t.id,
          name: t.name,
          short_name: t.shortName,
          code: t.code || t.id,
          purse: t.purse || 12500,
          spent: t.spent || 0,
          remaining: t.remaining != null ? t.remaining : 12500,
          max_slots: t.maxSlots || 25,
          min_slots: t.minSlots || 7,
          filled_slots: t.filledSlots || 0,
          color: t.color || '#211C17',
          logo_url: t.logo || t.logo_url || ''
        }));
        await this.client.from('teams').upsert(teamsData, { onConflict: 'id' });
        console.log(`[SUPABASE SERVICE] ✓ Seeded ${teamsData.length} teams.`);
      }

      // Seed auction singleton
      await this.client.from('auctions').upsert({
        id: 1,
        status: 'idle',
        current_bid: 0,
        base_price: 0,
        timer: 15,
        max_timer: 15,
        gavel_stage: 0,
        bid_increment: 10,
        session_label: '2026 MEGA AUCTION'
      }, { onConflict: 'id' });

      if (fs.existsSync(playersPath)) {
        const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        const playersData = players.map(p => ({
          id: p.id,
          lot_number: p.lotNumber || p.id,
          name: p.name,
          display_name: p.displayName || p.name,
          role: p.role,
          role_label: p.roleLabel || p.role,
          nationality: p.nationality || 'India',
          overseas: Boolean(p.overseas),
          capped: p.capped !== false,
          set_name: p.set || p.setName || 'SET 01',
          base_price: p.basePrice || 200,
          image: p.image || null,
          icon: p.icon || 'sports_cricket',
          stats: p.stats || {},
          tactical_profile: p.tacticalProfile || ('Official IPL profile for ' + p.name),
          status: 'available'
        }));

        // Batch insert in chunks of 25
        for (let i = 0; i < playersData.length; i += 25) {
          const chunk = playersData.slice(i, i + 25);
          await this.client.from('players').upsert(chunk, { onConflict: 'id' });
        }
        console.log(`[SUPABASE SERVICE] ✓ Seeded ${playersData.length} official cricketers.`);
      }
    } catch (err) {
      console.error('[SUPABASE SERVICE] Error seeding database:', err.message);
    }
  }

  // ─── BACKGROUND WRITE HOOKS (NON-BLOCKING) ──────────────────────────

  async recordBid(bidData) {
    if (!this.isConnected || !this.client) return;

    // Run asynchronously in background
    setImmediate(async () => {
      try {
        const { playerId, teamId, amount, auctionId } = bidData;

        // 1. Insert into bids table
        await this.client.from('bids').insert({
          auction_id: auctionId || 1,
          player_id: playerId,
          team_id: teamId,
          amount: amount
        });

        // 2. Update auction active state
        await this.client.from('auctions').update({
          current_bid: amount,
          leading_team_id: teamId,
          timer: bidData.timer || 15,
          gavel_stage: 0,
          bid_increment: bidData.bidIncrement || 10,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        // 3. Log into auction_events
        await this.client.from('auction_events').insert({
          auction_id: 1,
          player_id: playerId,
          event_type: 'BID_PLACED',
          actor_team_id: teamId,
          actor_role: 'team_owner',
          amount_lakh: amount,
          metadata: { teamId, amount, placedAt: new Date().toISOString() }
        });

        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error saving bid to Supabase:', err.message);
      }
    });
  }

  async recordLotStarted(lotData) {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        const { player, timer, maxTimer, lotIndex } = lotData;

        // 1. Update player status
        await this.client.from('players').update({
          status: 'on_hammer',
          updated_at: new Date().toISOString()
        }).eq('id', player.id);

        // 2. Update auction singleton
        await this.client.from('auctions').update({
          status: 'live',
          current_player_id: player.id,
          current_bid: player.basePrice,
          base_price: player.basePrice,
          leading_team_id: null,
          timer: timer || maxTimer || 15,
          max_timer: maxTimer || 15,
          gavel_stage: 0,
          lot_index: lotIndex || 1,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        // 3. Log event
        await this.client.from('auction_events').insert({
          auction_id: 1,
          lot_id: player.lotNumber || lotIndex,
          player_id: player.id,
          event_type: 'LOT_OPENED',
          actor_role: 'auctioneer',
          amount_lakh: player.basePrice,
          metadata: {
            name: player.name,
            role: player.role,
            basePrice: player.basePrice,
            nationality: player.nationality
          }
        });

        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error saving lot start to Supabase:', err.message);
      }
    });
  }

  async recordLotSold(soldData) {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        const { player, winnerTeamId, amount, bidHistory, lotIndex } = soldData;

        // 1. Update player status
        await this.client.from('players').update({
          status: 'sold',
          sold_to: winnerTeamId,
          sold_price: amount,
          updated_at: new Date().toISOString()
        }).eq('id', player.id);

        // 2. Record team squad acquisition
        await this.client.from('team_squads').upsert({
          team_id: winnerTeamId,
          player_id: player.id,
          sold_price: amount,
          acquired_at: new Date().toISOString()
        }, { onConflict: 'team_id, player_id' });

        // 3. Recalculate team purse and slot counts
        const { data: squadData } = await this.client
          .from('team_squads')
          .select('sold_price')
          .eq('team_id', winnerTeamId);

        if (squadData) {
          const totalSpent = squadData.reduce((sum, item) => sum + (item.sold_price || 0), 0);
          const remaining = 12500 - totalSpent;
          await this.client.from('teams').update({
            spent: totalSpent,
            remaining: remaining,
            purse: remaining,
            filled_slots: squadData.length,
            updated_at: new Date().toISOString()
          }).eq('id', winnerTeamId);
        }

        // 4. Record archival history
        await this.client.from('auction_history').insert({
          player_id: player.id,
          player_name: player.name,
          player_role: player.role,
          lot_number: player.lotNumber || lotIndex || 0,
          result: 'sold',
          sold_to: winnerTeamId,
          sold_price: amount,
          base_price: player.basePrice,
          bid_count: bidHistory ? bidHistory.length : 0,
          bid_history: bidHistory || []
        });

        // 5. Reset singleton auction state
        await this.client.from('auctions').update({
          status: 'idle',
          current_player_id: null,
          current_bid: 0,
          base_price: 0,
          leading_team_id: null,
          timer: 0,
          gavel_stage: 0,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        // 6. Log event
        await this.client.from('auction_events').insert({
          auction_id: 1,
          lot_id: player.lotNumber || lotIndex,
          player_id: player.id,
          event_type: 'LOT_SOLD',
          actor_team_id: winnerTeamId,
          actor_role: 'auctioneer',
          amount_lakh: amount,
          metadata: {
            name: player.name,
            winnerTeamId,
            soldPrice: amount
          }
        });

        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error saving lot sold to Supabase:', err.message);
      }
    });
  }

  async recordLotUnsold(unsoldData) {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        const { player, bidHistory, lotIndex } = unsoldData;

        // 1. Update player status
        await this.client.from('players').update({
          status: 'unsold',
          sold_to: null,
          sold_price: null,
          updated_at: new Date().toISOString()
        }).eq('id', player.id);

        // 2. Record in archival history
        await this.client.from('auction_history').insert({
          player_id: player.id,
          player_name: player.name,
          player_role: player.role,
          lot_number: player.lotNumber || lotIndex || 0,
          result: 'unsold',
          sold_to: null,
          sold_price: null,
          base_price: player.basePrice,
          bid_count: bidHistory ? bidHistory.length : 0,
          bid_history: bidHistory || []
        });

        // 3. Reset singleton state
        await this.client.from('auctions').update({
          status: 'idle',
          current_player_id: null,
          current_bid: 0,
          base_price: 0,
          leading_team_id: null,
          timer: 0,
          gavel_stage: 0,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        // 4. Log event
        await this.client.from('auction_events').insert({
          auction_id: 1,
          lot_id: player.lotNumber || lotIndex,
          player_id: player.id,
          event_type: 'LOT_UNSOLD',
          actor_role: 'auctioneer',
          amount_lakh: player.basePrice,
          metadata: { name: player.name, basePrice: player.basePrice }
        });

        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error saving lot unsold to Supabase:', err.message);
      }
    });
  }

  recordTimerDebounced(timer, gavelStage) {
    if (!this.isConnected || !this.client) return;

    if (this._timerDebounce) return;
    this._timerDebounce = setTimeout(async () => {
      this._timerDebounce = null;
      try {
        await this.client.from('auctions').update({
          timer: timer,
          gavel_stage: gavelStage,
          updated_at: new Date().toISOString()
        }).eq('id', 1);
      } catch (e) { /* ignore periodic tick errors */ }
    }, 2000);
  }

  async recordPauseResume(status) {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        await this.client.from('auctions').update({
          status: status,
          updated_at: new Date().toISOString()
        }).eq('id', 1);

        await this.client.from('auction_events').insert({
          auction_id: 1,
          event_type: status === 'paused' ? 'AUCTION_PAUSED' : 'AUCTION_RESUMED',
          actor_role: 'auctioneer',
          metadata: { status }
        });
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error updating pause state:', err.message);
      }
    });
  }

  async recordReset() {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        // Try calling stored procedure if available
        const { error: rpcErr } = await this.client.rpc('fn_reset_auction');
        if (rpcErr) {
          // Direct fallback reset
          await this.client.from('players').update({ status: 'available', sold_to: null, sold_price: null });
          await this.client.from('teams').update({ spent: 0, remaining: 12500, purse: 12500, filled_slots: 0 });
          await this.client.from('team_squads').delete().neq('id', 0);
          await this.client.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await this.client.from('auction_history').delete().neq('id', 0);
          await this.client.from('auctions').update({
            status: 'idle',
            current_player_id: null,
            current_bid: 0,
            base_price: 0,
            leading_team_id: null,
            timer: 15,
            gavel_stage: 0,
            lot_index: 0
          }).eq('id', 1);
        }
        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error resetting auction in Supabase:', err.message);
      }
    });
  }

  async recordCaptainRetention(retentionData) {
    if (!this.isConnected || !this.client) return;

    setImmediate(async () => {
      try {
        const { teamId, playerId, price, player } = retentionData;

        await this.client.from('players').update({
          status: 'sold',
          sold_to: teamId,
          sold_price: price,
          updated_at: new Date().toISOString()
        }).eq('id', playerId);

        await this.client.from('team_squads').upsert({
          team_id: teamId,
          player_id: playerId,
          sold_price: price,
          acquired_at: new Date().toISOString()
        }, { onConflict: 'team_id, player_id' });

        // Update team metrics
        const { data: squadData } = await this.client
          .from('team_squads')
          .select('sold_price')
          .eq('team_id', teamId);

        if (squadData) {
          const totalSpent = squadData.reduce((sum, item) => sum + (item.sold_price || 0), 0);
          await this.client.from('teams').update({
            spent: totalSpent,
            remaining: 12500 - totalSpent,
            purse: 12500 - totalSpent,
            filled_slots: squadData.length,
            updated_at: new Date().toISOString()
          }).eq('id', teamId);
        }

        await this.client.from('auction_events').insert({
          auction_id: 1,
          player_id: playerId,
          event_type: 'CAPTAIN_RETAINED',
          actor_team_id: teamId,
          actor_role: 'auctioneer',
          amount_lakh: price,
          metadata: { name: player ? player.name : '', teamId, price }
        });

        this.lastSyncTime = new Date().toISOString();
      } catch (err) {
        console.warn('[SUPABASE SERVICE] Error recording captain retention in Supabase:', err.message);
      }
    });
  }

  async getStatus() {
    const status = {
      isConfigured: this.isConfigured(),
      isConnected: this.isConnected,
      url: this.url ? this.url.replace(/(https:\/\/[^.]+).*/, '$1.supabase.co') : null,
      lastError: this.lastError,
      lastSyncTime: this.lastSyncTime,
      tableCounts: {}
    };

    if (this.isConnected && this.client) {
      try {
        const [p, t, b, s, h, e] = await Promise.all([
          this.client.from('players').select('*', { count: 'exact', head: true }),
          this.client.from('teams').select('*', { count: 'exact', head: true }),
          this.client.from('bids').select('*', { count: 'exact', head: true }),
          this.client.from('team_squads').select('*', { count: 'exact', head: true }),
          this.client.from('auction_history').select('*', { count: 'exact', head: true }),
          this.client.from('auction_events').select('*', { count: 'exact', head: true })
        ]);

        status.tableCounts = {
          players: p.count || 0,
          teams: t.count || 0,
          bids: b.count || 0,
          squads: s.count || 0,
          history: h.count || 0,
          events: e.count || 0
        };
      } catch (e) {
        status.tableCounts = { error: e.message };
      }
    }

    return status;
  }
}

module.exports = new SupabaseService();

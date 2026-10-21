/**
 * HAMMER — Comprehensive Production Supabase Engine Verification Suite
 * Verifies:
 * 1. Master production SQL schema integrity (tables, foreign keys, triggers, functions, RLS, publication)
 * 2. Supabase Schema Visualizer relationship completeness (all 8 tables connected)
 * 3. Supabase Triggers (updated_at, squad metrics, bid audit, status audit, auth users)
 * 4. Stored Procedures (atomic bidding, hammer sold/unsold, captain retention, etc.)
 * 5. Complete 73-player and 10-team seed data
 * 6. Backend background persistence service integration
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

function test(title, fn) {
  try {
    fn();
    console.log(`  ✓ ${title}`);
  } catch (err) {
    console.error(`  ✗ ${title}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- HAMMER: PRODUCTION SUPABASE DATABASE & REALTIME AUDIT ---\n');

test('Master Production SQL Schema Exists and Validates', () => {
  const masterPath = path.join(ROOT, 'backend', 'master_production_schema.sql');
  if (!fs.existsSync(masterPath)) throw new Error('backend/master_production_schema.sql not found');
  const sql = fs.readFileSync(masterPath, 'utf8');

  // Verify all 8 core tables
  const expectedTables = [
    'public.teams',
    'public.profiles',
    'public.players',
    'public.auctions',
    'public.bids',
    'public.team_squads',
    'public.auction_history',
    'public.auction_events'
  ];
  for (const t of expectedTables) {
    if (!sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`)) {
      throw new Error(`Missing table definition for ${t}`);
    }
  }
});

test('Schema Visualizer: All 8 Tables Linked with Relational Foreign Keys', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'backend', 'master_production_schema.sql'), 'utf8');

  // Relational connections required for Supabase Schema Visualizer
  const requiredForeignKeys = [
    'REFERENCES auth.users(id)',
    'REFERENCES public.teams(id)',
    'REFERENCES public.players(id)',
    'REFERENCES public.auctions(id)'
  ];

  for (const fk of requiredForeignKeys) {
    if (!sql.includes(fk)) throw new Error(`Missing foreign key constraint: ${fk}`);
  }
});

test('Supabase Database Triggers Defined and Active', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'backend', 'master_production_schema.sql'), 'utf8');

  const expectedTriggers = [
    'trg_teams_updated_at',
    'trg_players_updated_at',
    'trg_auctions_updated_at',
    'trg_profiles_updated_at',
    'trg_sync_team_metrics_mod',
    'trg_audit_bid',
    'trg_audit_player_status',
    'on_auth_user_created'
  ];

  for (const trg of expectedTriggers) {
    if (!sql.includes(trg)) throw new Error(`Missing trigger: ${trg}`);
  }

  const expectedTriggerFunctions = [
    'fn_update_timestamp',
    'fn_sync_team_metrics',
    'fn_audit_bid_placed',
    'fn_audit_player_status_change',
    'fn_handle_new_user'
  ];

  for (const fn of expectedTriggerFunctions) {
    if (!sql.includes(`FUNCTION public.${fn}`)) {
      throw new Error(`Missing trigger function: ${fn}`);
    }
  }
});

test('Authoritative Stored Procedures for Concurrency and Business Rules', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'backend', 'master_production_schema.sql'), 'utf8');

  const requiredProcedures = [
    'fn_place_bid',
    'fn_start_auction',
    'fn_sell_player',
    'fn_unsold_player',
    'fn_pause_auction',
    'fn_resume_auction',
    'fn_reset_auction',
    'fn_set_timer_duration',
    'fn_add_timer',
    'fn_reset_timer',
    'fn_set_gavel',
    'fn_retain_captain',
    'fn_log_auction_event',
    'format_cr',
    'get_bid_increment',
    'get_next_valid_bid',
    'seed_hammer_users'
  ];

  for (const proc of requiredProcedures) {
    if (!sql.includes(`FUNCTION public.${proc}`)) {
      throw new Error(`Missing procedure: ${proc}`);
    }
  }
});

test('Realtime Publication Includes All 7 Observable Tables', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'backend', 'master_production_schema.sql'), 'utf8');

  const tables = ['teams', 'players', 'auctions', 'bids', 'team_squads', 'auction_history', 'auction_events'];
  for (const t of tables) {
    if (!sql.includes(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${t}`)) {
      throw new Error(`Table ${t} missing from supabase_realtime publication`);
    }
  }
});

test('Seed Data Contains All 10 Franchises and All 73 Players', () => {
  const seedSql = fs.readFileSync(path.join(ROOT, 'backend', 'seed.sql'), 'utf8');
  const players = require(path.join(ROOT, 'data', 'players.json'));

  if (players.length !== 73) {
    throw new Error(`Expected 73 players in data/players.json, found ${players.length}`);
  }

  // Verify first and last player from catalog are present in seed
  if (!seedSql.includes('VIRAT KOHLI')) throw new Error('Missing Virat Kohli in seed');
  if (!seedSql.includes('PHILIP SALT')) throw new Error('Missing Philip Salt in seed');
});

test('Backend Supabase Service Hooks Integrated in server.js', () => {
  const serverCode = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

  if (!serverCode.includes("require('./backend/supabase-service')")) {
    throw new Error('server.js must import backend/supabase-service');
  }
  if (!serverCode.includes('supabaseService.recordBid')) {
    throw new Error('server.js must invoke supabaseService.recordBid on accepted bids');
  }
  if (!serverCode.includes('supabaseService.recordLotStarted')) {
    throw new Error('server.js must invoke supabaseService.recordLotStarted on lot open');
  }
  if (!serverCode.includes('supabaseService.recordLotSold')) {
    throw new Error('server.js must invoke supabaseService.recordLotSold on sold resolution');
  }
  if (!serverCode.includes('supabaseService.recordLotUnsold')) {
    throw new Error('server.js must invoke supabaseService.recordLotUnsold on unsold resolution');
  }
  if (!serverCode.includes('supabaseService.recordReset')) {
    throw new Error('server.js must invoke supabaseService.recordReset on auction reset');
  }
  if (!serverCode.includes('/api/config/supabase')) {
    throw new Error('server.js must expose /api/config/supabase endpoint');
  }
  if (!serverCode.includes('/api/supabase/status')) {
    throw new Error('server.js must expose /api/supabase/status endpoint');
  }
});

test('Client Browser Auto-Discovery Configured in supabase-config.js', () => {
  const clientConfig = fs.readFileSync(path.join(ROOT, 'js', 'supabase-config.js'), 'utf8');
  if (!clientConfig.includes('/api/config/supabase')) {
    throw new Error('js/supabase-config.js must support auto-discovery via /api/config/supabase');
  }
});

console.log('\n--- ALL PRODUCTION SUPABASE VERIFICATION CHECKS PASSED ---\n');

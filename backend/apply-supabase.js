/**
 * HAMMER — Supabase Migration & Database Synchronization Utility
 * Usage:
 *   node backend/apply-supabase.js status
 *   node backend/apply-supabase.js seed
 *   node backend/apply-supabase.js sync
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabaseService = require('./supabase-service');

async function main() {
  const command = (process.argv[2] || 'status').toLowerCase();

  console.log('\n======================================================');
  console.log('   HAMMER AUCTION ENGINE — SUPABASE DATABASE SYNC    ');
  console.log('======================================================\n');

  if (!supabaseService.isConfigured()) {
    console.log('⚠️  Supabase credentials not detected in .env.');
    console.log('   Please set the following in your .env file:');
    console.log('     SUPABASE_URL=https://<your-project-id>.supabase.co');
    console.log('     SUPABASE_ANON_KEY=eyJhbG...');
    console.log('     SUPABASE_SERVICE_ROLE_KEY=eyJhbG...\n');
    console.log('   Master SQL Schema available at:');
    console.log('     backend/master_production_schema.sql');
    console.log('   Paste this into the Supabase Dashboard -> SQL Editor -> Run!\n');
    process.exit(0);
  }

  console.log(`Connecting to: ${supabaseService.url}...`);
  const connected = await supabaseService.testConnection();

  if (!connected) {
    console.error(`❌ Connection failed: ${supabaseService.lastError}`);
    console.log('\nTip: If you haven\'t run the database migration yet:');
    console.log('  1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('  2. Go to "SQL Editor"');
    console.log('  3. Paste the contents of backend/master_production_schema.sql');
    console.log('  4. Click "Run"');
    process.exit(1);
  }

  console.log('✓ Successfully connected to Supabase PostgreSQL database!\n');

  if (command === 'status') {
    const status = await supabaseService.getStatus();
    console.log('--- SUPABASE DATABASE AUDIT STATUS ---');
    console.log(`Connected  : ${status.isConnected ? 'YES' : 'NO'}`);
    console.log(`Project URL: ${status.url}`);
    console.log(`Last Sync  : ${status.lastSyncTime || 'N/A'}`);
    console.log('\nTable Record Counts:');
    if (status.tableCounts && !status.tableCounts.error) {
      for (const [tbl, count] of Object.entries(status.tableCounts)) {
        console.log(`  • ${tbl.padEnd(15)}: ${count} rows`);
      }
    } else {
      console.log('  (Could not read counts, tables may need creation in SQL Editor)');
    }
  } else if (command === 'seed' || command === 'sync') {
    console.log('Seeding 10 teams and 73 players into Supabase...');
    await supabaseService.seedFromLocalFiles();
    console.log('✓ Seeding complete!');

    const status = await supabaseService.getStatus();
    console.log('\nUpdated Table Record Counts:');
    for (const [tbl, count] of Object.entries(status.tableCounts || {})) {
      console.log(`  • ${tbl.padEnd(15)}: ${count} rows`);
    }
  }

  console.log('\n======================================================\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

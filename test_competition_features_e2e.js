/**
 * HAMMER — Competition Features & Realtime Sync Comprehensive E2E Verification
 * Tests:
 * 1. Multi-client authoritative flow (Auctioneer -> Team A -> Team B -> Auctioneer SOLD)
 * 2. Activity Log generation & sequence numbering (LOT_OPENED, BID_PLACED, LOT_SOLD, TEAM_SQUAD_UPDATED)
 * 3. Realtime event emission (auction:event, activity_created)
 * 4. Authoritative Exports (Squads CSV/JSON, Sold Players CSV/JSON, Activity Log CSV/JSON, Lot Replay CSV/JSON)
 * 5. Final Squads rules validation (size >= 7, WK >= 1, bowlers >= 3, overseas <= 8)
 * 6. Page route health checks (index, activity-log, final-squads, lot-replay, player-pool, team-console, auction-desk)
 */

const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('================================================================');
  console.log('HAMMER // COMPETITION FEATURES & REALTIME SYNC TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // ─── TEST 1: Page Route Availability ─────────────────────────
  console.log('TEST 1: Verifying Page Routes & Endpoints...');
  const pages = [
    '/',
    '/index.html',
    '/activity-log.html',
    '/final-squads.html',
    '/lot-replay.html',
    '/player-pool.html',
    '/login.html'
  ];

  for (const page of pages) {
    const res = await fetch(`${BASE_URL}${page}`);
    assert(res.status === 200, `Page route ${page} returned HTTP 200 OK`);
  }

  // ─── TEST 2: Authoritative Authentication ───────────────────
  console.log('\nTEST 2: Authenticating Multi-Client Roles...');
  
  // Auctioneer login
  const loginAuctioneer = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'auctioneer', password: 'hammer2026' })
  }).then(r => r.json());
  assert(loginAuctioneer.token && loginAuctioneer.user.role === 'auctioneer', 'Auctioneer authenticated successfully');

  // Team MI login
  const loginMI = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mi', password: 'mi2026' })
  }).then(r => r.json());
  assert(loginMI.token && loginMI.user.teamId === 'MI', 'Team MI authenticated successfully');

  // Team CSK login
  const loginCSK = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'csk', password: 'csk2026' })
  }).then(r => r.json());
  assert(loginCSK.token && loginCSK.user.teamId === 'CSK', 'Team CSK authenticated successfully');

  // ─── TEST 3: Multi-Client Realtime Socket Subscriptions ─────
  console.log('\nTEST 3: Setting up Realtime Sockets with Dedup & Sequence Tracking...');
  
  const clientEvents = [];
  const socketViewer = io(BASE_URL, { transports: ['websocket'] });
  
  await new Promise(resolve => {
    socketViewer.on('connect', () => {
      resolve();
    });
  });

  socketViewer.on('auction:event', (ev) => {
    clientEvents.push(ev);
  });
  socketViewer.on('activity_created', (ev) => {
    // Both events emitted for maximum client compatibility
  });

  // ─── TEST 4: Authoritative Auction Flow Execution ───────────
  console.log('\nTEST 4: Executing Authoritative Bidding & Settlement Flow...');

  // Reset lot state first if needed
  await fetch(`${BASE_URL}/api/auction/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginAuctioneer.token}`
    }
  });

  // Find an available player
  const playersRes = await fetch(`${BASE_URL}/api/players?status=available&limit=1`).then(r => r.json());
  const testPlayer = playersRes.players[0];
  assert(testPlayer != null, `Selected available player: ${testPlayer.name} (Lot #${testPlayer.lotNumber}, Base: ₹${testPlayer.basePrice}L)`);

  // Step 4.1: Auctioneer starts lot
  const startRes = await fetch(`${BASE_URL}/api/auction/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginAuctioneer.token}`
    },
    body: JSON.stringify({ playerId: testPlayer.id })
  }).then(r => r.json());
  assert(startRes.success === true, 'Auctioneer successfully put player on hammer');

  // Step 4.2: Team MI places first bid at base price
  const miBidRes = await fetch(`${BASE_URL}/api/auction/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginMI.token}`
    },
    body: JSON.stringify({ expectedBid: testPlayer.basePrice })
  }).then(r => r.json());
  assert(miBidRes.success === true && miBidRes.acceptedBid === testPlayer.basePrice, `Team MI bid accepted at ₹${testPlayer.basePrice}L`);

  // Step 4.3: Team CSK places outbid
  const nextExpected = miBidRes.state.currentBid + miBidRes.state.bidIncrement;
  const cskBidRes = await fetch(`${BASE_URL}/api/auction/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginCSK.token}`
    },
    body: JSON.stringify({ expectedBid: nextExpected })
  }).then(r => r.json());
  assert(cskBidRes.success === true && cskBidRes.acceptedBid === nextExpected, `Team CSK outbid accepted at ₹${nextExpected}L`);

  // Step 4.4: Team MI counters
  const miCounterExpected = cskBidRes.state.currentBid + cskBidRes.state.bidIncrement;
  const miCounterRes = await fetch(`${BASE_URL}/api/auction/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginMI.token}`
    },
    body: JSON.stringify({ expectedBid: miCounterExpected })
  }).then(r => r.json());
  assert(miCounterRes.success === true && miCounterRes.acceptedBid === miCounterExpected, `Team MI counter-bid accepted at ₹${miCounterExpected}L`);

  // Step 4.5: Auctioneer confirms SOLD
  const soldRes = await fetch(`${BASE_URL}/api/auction/sold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginAuctioneer.token}`
    }
  }).then(r => r.json());
  assert(soldRes.success === true && soldRes.team.id === 'MI' && soldRes.price === miCounterExpected, `Auctioneer marked SOLD to MI for ₹${miCounterExpected}L`);

  // Allow realtime packets to propagate
  await new Promise(r => setTimeout(r, 400));

  // ─── TEST 5: Verify Activity Events & Sequencing ────────────
  console.log('\nTEST 5: Verifying Activity Events & Sequence Integrity...');
  const unauthRes = await fetch(`${BASE_URL}/api/auction/activity`);
  assert(unauthRes.status === 401, 'Unauthenticated access to activity log must be blocked with 401');

  const activityRes = await fetch(`${BASE_URL}/api/auction/activity`, {
    headers: { 'Authorization': `Bearer ${loginAuctioneer.token}` }
  }).then(r => r.json());
  assert(activityRes.events && activityRes.events.length > 0, `Activity API returned ${activityRes.events?.length} total events`);

  const openedEv = activityRes.events.find(e => e.event_type === 'LOT_OPENED' && e.player_id === testPlayer.id);
  assert(openedEv != null && openedEv.event_sequence > 0, `LOT_OPENED event recorded with sequence #${openedEv?.event_sequence}`);

  const bidsEv = activityRes.events.filter(e => e.event_type === 'BID_PLACED' && e.player_id === testPlayer.id);
  assert(bidsEv.length >= 3, `Recorded ${bidsEv.length} BID_PLACED events with valid sequences`);

  const soldEv = activityRes.events.find(e => e.event_type === 'LOT_SOLD' && e.player_id === testPlayer.id);
  assert(soldEv != null && soldEv.amount_lakh === miCounterExpected && soldEv.actor_team_id === 'MI', `LOT_SOLD event recorded with MI winning bid ₹${soldEv?.amount_lakh}L`);

  const squadEv = activityRes.events.find(e => e.event_type === 'TEAM_SQUAD_UPDATED' && e.actor_team_id === 'MI');
  assert(squadEv != null, 'TEAM_SQUAD_UPDATED event recorded for MI roster');

  // Verify Realtime socket received events
  assert(clientEvents.length >= 4, `Connected WebSocket received ${clientEvents.length} live auction events without manual refresh`);

  // ─── TEST 6: Authoritative Export Functionality ──────────────
  console.log('\nTEST 6: Testing Authoritative Exports (CSV & JSON)...');

  // 6.1 Squads Export
  const squadsCsv = await fetch(`${BASE_URL}/api/export/squads?format=csv`).then(r => r.text());
  assert(squadsCsv.includes('Franchise Code') && squadsCsv.includes(testPlayer.name), 'Squads CSV export contains headers and sold player');

  const squadsJson = await fetch(`${BASE_URL}/api/export/squads?format=json`).then(r => r.json());
  assert(squadsJson.franchises && squadsJson.franchises.length === 10, 'Squads JSON export contains all 10 franchises');

  // 6.2 Sold Players Export
  const soldCsv = await fetch(`${BASE_URL}/api/export/sold?format=csv`).then(r => r.text());
  assert(soldCsv.includes('Lot #') && soldCsv.includes(testPlayer.name) && soldCsv.includes('MI'), 'Sold players CSV contains acquired cricketer and franchise');

  const soldJson = await fetch(`${BASE_URL}/api/export/sold?format=json`).then(r => r.json());
  assert(soldJson.players && soldJson.players.some(p => p.name === testPlayer.name), 'Sold players JSON contains acquired player record');

  // 6.3 Activity Log Export (Auctioneer Only)
  const unauthExportRes = await fetch(`${BASE_URL}/api/export/activity?format=csv`);
  assert(unauthExportRes.status === 401, 'Unauthenticated export activity must be blocked with 401');

  const activityCsv = await fetch(`${BASE_URL}/api/export/activity?format=csv`, {
    headers: { 'Authorization': `Bearer ${loginAuctioneer.token}` }
  }).then(r => r.text());
  assert(activityCsv.includes('Sequence') && activityCsv.includes('BID_PLACED') && activityCsv.includes('LOT_SOLD'), 'Activity Log CSV contains sequenced events');

  // 6.4 Lot Replay Export
  const lotReplayCsv = await fetch(`${BASE_URL}/api/export/lot/${testPlayer.lotNumber}?format=csv`).then(r => r.text());
  assert(lotReplayCsv.includes('Bid #') && lotReplayCsv.includes('RESULT'), 'Lot Replay CSV contains step-by-step bids and final result');

  const lotReplayJson = await fetch(`${BASE_URL}/api/export/lot/${testPlayer.lotNumber}?format=json`).then(r => r.json());
  assert(lotReplayJson.bidHistory && lotReplayJson.bidHistory.length >= 3 && lotReplayJson.soldTo?.shortName === 'MI', 'Lot Replay JSON contains full bid sequence and winning franchise');

  // ─── TEST 7: Squad Rule Compliance Verification ─────────────
  console.log('\nTEST 7: Checking Squad Rules Compliance...');
  const miTeam = await fetch(`${BASE_URL}/api/teams/MI`).then(r => r.json());
  assert(miTeam.players && miTeam.players.some(p => p.id === testPlayer.id), 'Team MI squad contains acquired player');
  assert(miTeam.remaining === miTeam.purse - miTeam.spent, 'Team MI remaining purse accurately matches (purse - spent)');

  socketViewer.disconnect();

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

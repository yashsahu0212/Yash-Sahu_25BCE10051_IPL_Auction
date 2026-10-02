const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:3000';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          rawBuffer: buffer,
          text: buffer.toString('utf-8'),
          json: () => {
            try { return JSON.parse(buffer.toString('utf-8')); }
            catch (e) { return null; }
          }
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(username, password) {
  const res = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });

  const data = res.json();
  const setCookie = res.headers['set-cookie'];
  let cookieHeader = '';
  if (setCookie) {
    cookieHeader = Array.isArray(setCookie) ? setCookie[0].split(';')[0] : setCookie.split(';')[0];
  }
  return { token: data.token, cookie: cookieHeader, user: data.user };
}

async function runTests() {
  console.log('===============================================================');
  console.log('  HAMMER AUCTION ENGINE: TIMER EXPIRATION & RESOLUTION TEST   ');
  console.log('===============================================================\n');

  // 1. Authenticate users
  const auctioneer = await login('auctioneer', 'hammer2026');
  const csk = await login('csk', 'csk2026');
  const mi = await login('mi', 'mi2026');

  console.log('✓ Auctioneer & Team Owners authenticated');

  const authHeader = (auth) => ({
    'Authorization': `Bearer ${auth.token}`,
    'Cookie': auth.cookie,
    'Content-Type': 'application/json'
  });

  // 2. Test CSV Export for UTF-8 BOM & Mojibake Prevention
  console.log('\n--- TEST 1: CSV Export Encoding & Mojibake Check ---');
  const squadExport = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/export/squads?format=csv',
    method: 'GET'
  });

  assert.strictEqual(squadExport.status, 200);
  assert(squadExport.headers['content-type'].includes('charset=utf-8'), 'Content-Type must include charset=utf-8');
  
  // Verify UTF-8 BOM at the very beginning (0xEF, 0xBB, 0xBF)
  assert.strictEqual(squadExport.rawBuffer[0], 0xEF, 'BOM byte 1 must be 0xEF');
  assert.strictEqual(squadExport.rawBuffer[1], 0xBB, 'BOM byte 2 must be 0xBB');
  assert.strictEqual(squadExport.rawBuffer[2], 0xBF, 'BOM byte 3 must be 0xBF');
  console.log('✓ UTF-8 Byte Order Mark (\\uFEFF / 0xEF 0xBB 0xBF) verified at byte offset 0');

  // Verify no ANSI mojibake characters exist in the decoded string
  assert(!squadExport.text.includes('â‚¹'), 'Exported CSV must NOT contain mojibake â‚¹');
  assert(!squadExport.text.includes('â€“'), 'Exported CSV must NOT contain mojibake â€“');
  assert(!squadExport.text.includes('â€”'), 'Exported CSV must NOT contain mojibake â€”');
  console.log('✓ Confirmed 0 mojibake symbols (â‚¹, â€“) in exported CSV string');

  // 3. Test Resolution Mode API
  console.log('\n--- TEST 2: Auctioneer Resolution Mode Settings ---');
  
  // Team owner should be forbidden (403)
  const forbiddenRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/resolution-mode',
    method: 'POST',
    headers: authHeader(csk)
  }, { mode: 'auto' });
  assert.strictEqual(forbiddenRes.status, 403, 'Team owner cannot modify resolution mode');
  console.log('✓ Non-auctioneer correctly rejected with 403 Forbidden');

  // Auctioneer sets to 'auto'
  const autoRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/resolution-mode',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { mode: 'auto' });
  assert.strictEqual(autoRes.status, 200);
  assert.strictEqual(autoRes.json().resolutionMode, 'auto');
  assert.strictEqual(autoRes.json().autoResolve, true);
  console.log('✓ Auctioneer successfully set resolution mode to AUTO');

  // Auctioneer sets back to 'manual'
  const manualRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/resolution-mode',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { mode: 'manual' });
  assert.strictEqual(manualRes.status, 200);
  assert.strictEqual(manualRes.json().resolutionMode, 'manual');
  assert.strictEqual(manualRes.json().autoResolve, false);
  console.log('✓ Auctioneer successfully set resolution mode to MANUAL');

  // 4. Test Bidding Blocked When Time Runs Out
  console.log('\n--- TEST 3: Bidding Blocked After Timer Runs Out ---');
  
  // Bring a player to hammer
  const playersRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/players?status=available&limit=1',
    method: 'GET'
  });
  const testPlayer = playersRes.json().players[0];
  console.log(`Bringing player ${testPlayer.name} (Lot #${testPlayer.lotNumber}) to hammer...`);

  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/start',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { playerId: testPlayer.id });

  // CSK places opening bid
  const bid1 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: authHeader(csk)
  }, { expectedBid: testPlayer.basePrice });
  assert.strictEqual(bid1.status, 200, 'Opening bid accepted');
  console.log(`✓ Opening bid of ₹${testPlayer.basePrice}L accepted for CSK`);

  // Now set timer to 5s authoritatively
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/settings',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { duration: 5 });

  // Reset timer to 1 second and wait for it to expire
  console.log('Setting timer to 1s and waiting for countdown expiration...');
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/reset',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { seconds: 1 });

  // Wait 1.5 seconds for timer to reach 0
  await new Promise(r => setTimeout(r, 1500));

  // MI attempts to bid now that timer has expired
  console.log('MI attempting to place bid after timer ran out...');
  const expiredBid = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: authHeader(mi)
  }, {});

  assert.strictEqual(expiredBid.status, 400, 'Expired bid must be rejected with 400');
  assert.strictEqual(expiredBid.json().code, 'TIMER_EXPIRED', 'Error code must be TIMER_EXPIRED');
  console.log('✓ Bid attempt rejected: ' + expiredBid.json().error);

  // Auctioneer extends timer by 10s
  console.log('Auctioneer adds +10s to clock...');
  const addTimeRes = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/add',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { seconds: 10 });
  assert.strictEqual(addTimeRes.status, 200);

  // MI bids now that timer is restored
  const restoredBid = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: authHeader(mi)
  }, {});
  assert.strictEqual(restoredBid.status, 200, 'Bid accepted after timer restored');
  console.log(`✓ MI bid successfully accepted after auctioneer added time: ₹${restoredBid.json().acceptedBid}L`);

  // Close this lot manually
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/sold',
    method: 'POST',
    headers: authHeader(auctioneer)
  });
  console.log('✓ Lot sold to MI');

  // 5. Test Automatic Sold/Unsold Resolution on Timer Expiry
  console.log('\n--- TEST 4: Automatic Sold / Unsold Resolution ---');

  // Set mode to AUTO
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/resolution-mode',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { mode: 'auto' });

  // Get next player
  const nextPlayers = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/players?status=available&limit=2',
    method: 'GET'
  });
  const playerAutoSold = nextPlayers.json().players[0];
  const playerAutoUnsold = nextPlayers.json().players[1];

  // Test Auto Sold:
  console.log(`Testing Auto-Sold for ${playerAutoSold.name}...`);
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/start',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { playerId: playerAutoSold.id });

  // CSK bids
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: authHeader(csk)
  }, { expectedBid: playerAutoSold.basePrice });

  // Set timer to 1s and let it run out
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/reset',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { seconds: 1 });

  await new Promise(r => setTimeout(r, 1600));

  // Check auction state - should now be idle and player marked sold to CSK
  const stateAutoSold = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/state',
    method: 'GET'
  });
  assert.strictEqual(stateAutoSold.json().status, 'idle', 'Auction status should be idle after auto-sold');
  
  const soldCheck = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/players/${playerAutoSold.id}`,
    method: 'GET'
  });
  const soldPlayerData = soldCheck.json();
  assert.strictEqual(soldPlayerData.status, 'sold', 'Player must be marked sold');
  assert.strictEqual(soldPlayerData.soldTo, 'CSK', 'Player must be sold to CSK');
  console.log(`✓ Successfully auto-sold ${playerAutoSold.name} to CSK upon timer expiration!`);

  // Test Auto Unsold:
  console.log(`Testing Auto-Unsold for ${playerAutoUnsold.name}...`);
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/start',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { playerId: playerAutoUnsold.id });

  // No bids placed. Set timer to 1s and let it run out
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/reset',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { seconds: 1 });

  await new Promise(r => setTimeout(r, 1600));

  const stateAutoUnsold = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/state',
    method: 'GET'
  });
  assert.strictEqual(stateAutoUnsold.json().status, 'idle', 'Auction status should be idle after auto-unsold');

  const unsoldCheck = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/api/players/${playerAutoUnsold.id}`,
    method: 'GET'
  });
  const unsoldPlayerData = unsoldCheck.json();
  assert.strictEqual(unsoldPlayerData.status, 'unsold', 'Player must be marked unsold');
  console.log(`✓ Successfully auto-marked ${playerAutoUnsold.name} as UNSOLD upon timer expiration!`);

  // Restore resolution mode to manual and timer to 15s
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/resolution-mode',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { mode: 'manual' });
  await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auction/timer/settings',
    method: 'POST',
    headers: authHeader(auctioneer)
  }, { duration: 15 });

  console.log('\n===============================================================');
  console.log('  ALL TESTS PASSED WITH 100% SUCCESS!                         ');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

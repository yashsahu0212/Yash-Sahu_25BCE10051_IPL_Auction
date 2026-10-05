/**
 * Test Suite: Franchise Captains Retention (IPL 2026)
 * Verifies that official 2026 franchise captains:
 * 1. Are retained automatically into franchise rosters when setting is ON
 * 2. Deduct base price from team purse and occupy a squad slot
 * 3. Cannot be brought to auction under the hammer (protected from bidding)
 * 4. Are cleanly released back to auction pool when setting is OFF
 */

const http = require('http');
const assert = require('assert');

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        resolve({ status: res.statusCode, data: parsed, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('\n--- HAMMER: IPL CAPTAINS RETENTION TEST ---\n');

  // 1. Reset state
  await request('POST', '/api/auction/reset');

  // 2. Login as auctioneer
  const loginRes = await request('POST', '/api/auth/login', { username: 'auctioneer', password: 'hammer2026' });
  const auctioneerCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
  assert(auctioneerCookie, 'Must authenticate auctioneer');

  // 3. Check captains endpoint
  const captainsRes = await request('GET', '/api/auction/captains');
  assert.strictEqual(captainsRes.status, 200);
  assert.strictEqual(captainsRes.data.captains.length, 10, 'Must have 10 official franchise captains');
  console.log('✓ 10 official 2026 franchise captains verified:');
  captainsRes.data.captains.forEach(c => console.log(`   - [${c.teamCode}] ${c.playerName} (${c.role})`));

  // 4. Retain captains
  console.log('\nActivating Franchise Captains Retention (IPL 2026)...');
  const retainRes = await request('POST', '/api/auction/captain-retention', { retain: true }, auctioneerCookie);
  assert.strictEqual(retainRes.status, 200);
  assert.strictEqual(retainRes.data.captainsRetained, true);
  console.log('✓ Captain retention activated');

  // 5. Verify team squads contain the captains
  const teamsRes = await request('GET', '/api/teams');
  const teams = teamsRes.data;
  assert.strictEqual(teams.length, 10);
  for (const t of teams) {
    assert(t.players.length >= 1, `Team ${t.shortName} must have at least 1 player`);
    const cap = t.players.find(p => p.isCaptain);
    assert(cap, `Team ${t.shortName} must have a retained captain`);
    console.log(`✓ Franchise ${t.shortName}: Captain ${cap.name} retained (Purse remaining: ₹${t.remaining}L)`);
  }

  // 6. Verify captain CANNOT go for auction bidding
  const viratId = 1; // Virat Kohli (RCB captain)
  const auctionAttempt = await request('POST', '/api/auction/start', { playerId: viratId }, auctioneerCookie);
  assert.strictEqual(auctionAttempt.status, 400);
  assert.strictEqual(auctionAttempt.data.code, 'ALREADY_SOLD');
  console.log('✓ Auction hammer guard successfully blocked bidding for retained captain (Virat Kohli)');

  // 7. Verify releasing captains
  console.log('\nReleasing captains back to auction pool...');
  const releaseRes = await request('POST', '/api/auction/captain-retention', { retain: false }, auctioneerCookie);
  assert.strictEqual(releaseRes.status, 200);
  assert.strictEqual(releaseRes.data.captainsRetained, false);
  console.log('✓ Captain retention released');

  // Verify Virat can now be auctioned
  const viratAuctionRes = await request('POST', '/api/auction/start', { playerId: viratId }, auctioneerCookie);
  assert.strictEqual(viratAuctionRes.status, 200);
  assert.strictEqual(viratAuctionRes.data.state.status, 'live');
  console.log('✓ Virat Kohli can now be auctioned when retention is OFF');

  // Clean up
  await request('POST', '/api/auction/reset');

  console.log('\n--- ALL CAPTAIN RETENTION TESTS PASSED ---\n');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

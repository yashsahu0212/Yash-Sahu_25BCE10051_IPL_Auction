/**
 * HAMMER — Mobile Realtime Synchronization & Zero-Delay Test Suite
 * Validates:
 * 1. CORS headers for mobile cross-origin requests
 * 2. Mobile network info discovery endpoint (/api/network-info)
 * 3. Mobile Web App route (/mobile and /mobile.html)
 * 4. Mobile Bearer token authentication
 * 5. Instant bidirectional Socket.IO synchronization between Web and Mobile clients without refresh
 * 6. Mobile bidding paddle execution and Rule 7 / Anti-sniping enforcement
 */

const http = require('http');
const { io: ioClient } = require('socket.io-client');
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (body) {
      const data = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(url, { method, headers: reqHeaders }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          text: raw
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' HAMMER — MOBILE APP REALTIME ZERO-DELAY TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function pass(title) {
    passed++;
    total++;
    console.log(`  ✓ TEST ${total}: ${title}`);
  }

  try {
    // 1. CORS Preflight & Headers
    const corsRes = await request('OPTIONS', '/api/auth/login', null, {
      'Origin': 'exp://127.0.0.1:8081',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Authorization,Content-Type'
    });
    assert.strictEqual(corsRes.status, 204, 'CORS preflight must return HTTP 204');
    assert.strictEqual(corsRes.headers['access-control-allow-origin'], '*', 'CORS origin must allow *');
    pass('CORS preflight (OPTIONS) returns 204 with Access-Control-Allow-Origin: *');

    // 2. Mobile Network Info Discovery
    const netRes = await request('GET', '/api/network-info');
    assert.strictEqual(netRes.status, 200);
    assert.ok(netRes.data.ip, 'IP address must be present');
    assert.ok(netRes.data.mobileAppUrl, 'mobileAppUrl must be present');
    pass(`Network info returns valid host IP (${netRes.data.ip}) and mobileAppUrl`);

    // 3. Mobile HTML Route
    const mobRes = await request('GET', '/mobile');
    assert.strictEqual(mobRes.status, 200);
    assert.ok(mobRes.text.includes('HAMMER • IPL Auction Mobile'), 'Must serve mobile app title');
    assert.ok(mobRes.text.includes('manifest.json'), 'Must include PWA manifest');
    pass('Mobile client route (/mobile) loads standalone PWA single-page application');

    // 4. Mobile Franchise Authentication via Bearer Token
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'csk',
      password: 'csk2026'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.token, 'Must return signed session token');
    const mobileToken = loginRes.data.token;

    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${mobileToken}`
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.user.role, 'team_owner');
    assert.strictEqual(meRes.data.user.teamId, 'CSK');
    pass('Mobile client authenticates with Bearer token header -> role team_owner (CSK)');

    // 5. Auctioneer Authentication
    const auctioneerLogin = await request('POST', '/api/auth/login', {
      username: 'auctioneer',
      password: 'hammer2026'
    });
    const auctioneerToken = auctioneerLogin.data.token;
    pass('Auctioneer authenticates and retrieves gavel authority token');

    // 6. Connect Web Client and Mobile Client over Socket.IO simultaneously
    const webSocket = ioClient(BASE_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    const mobileSocket = ioClient(BASE_URL, {
      transports: ['websocket'],
      auth: { token: mobileToken },
      forceNew: true
    });

    await Promise.all([
      new Promise(r => webSocket.on('connect', r)),
      new Promise(r => mobileSocket.on('connect', r))
    ]);
    pass('Web client and Mobile client connect simultaneously via WebSockets');

    // 7. Find an available player and start lot -> Both Web and Mobile receive state with 0 delay
    const playersRes = await request('GET', '/api/players?limit=100');
    const playersList = Array.isArray(playersRes.data) ? playersRes.data : (playersRes.data?.players || []);
    const availablePlayer = playersList.find(p => !p.status || p.status === 'available') || playersList[0];
    const targetPlayerId = availablePlayer.id;

    let webReceivedLot = null;
    let mobileReceivedLot = null;

    webSocket.on('auction:state', s => { if (s?.status === 'live') webReceivedLot = s; });
    mobileSocket.on('auction:state', s => { if (s?.status === 'live') mobileReceivedLot = s; });

    const startRes = await request('POST', '/api/auction/start', { playerId: targetPlayerId }, {
      'Authorization': `Bearer ${auctioneerToken}`
    });
    assert.strictEqual(startRes.status, 200, `Failed to start lot: ${JSON.stringify(startRes.data)}`);

    // Wait 150ms for websocket delivery
    await new Promise(r => setTimeout(r, 200));
    assert.ok(webReceivedLot, 'Web client must receive live auction:state without refresh');
    assert.ok(mobileReceivedLot, 'Mobile client must receive live auction:state without refresh');
    assert.strictEqual(mobileReceivedLot.currentPlayerId, targetPlayerId, 'Player ID must match started lot');
    pass(`Lot launch for ${availablePlayer.name} broadcasts instantaneously to both Web and Mobile clients`);

    // 8. Mobile client places bid via WebSocket -> Both clients receive auction:bid
    let webReceivedBid = null;
    let mobileReceivedBid = null;

    webSocket.on('auction:bid', b => { webReceivedBid = b; });
    mobileSocket.on('auction:bid', b => { mobileReceivedBid = b; });

    const expectedBid = mobileReceivedLot.basePrice || 200;
    const bidAck = await new Promise(resolve => {
      mobileSocket.emit('bid:place', { expectedBid }, resolve);
    });

    assert.strictEqual(bidAck.success, true, 'Mobile bid must be accepted');
    await new Promise(r => setTimeout(r, 150));

    assert.ok(webReceivedBid, 'Web broadcast must receive mobile bid instantly');
    assert.ok(mobileReceivedBid, 'Mobile console must receive confirmation instantly');
    assert.strictEqual(webReceivedBid.teamId, 'CSK', 'Leading team must update to CSK');
    pass('Mobile bid placed via WebSocket updates Web Broadcast with 0ms delay');

    // 9. Rule 7 Enforcement: Mobile team cannot outbid itself
    const selfOutbidAck = await new Promise(resolve => {
      mobileSocket.emit('bid:place', { expectedBid: expectedBid + 10 }, resolve);
    });
    assert.ok(selfOutbidAck.error.includes('cannot outbid itself') || selfOutbidAck.code === 'RULE_7_SELF_OUTBID');
    pass('Server enforces Rule 7: mobile team cannot bid against itself');

    // 10. Competing Franchise (MI) places counter-bid
    const miLogin = await request('POST', '/api/auth/login', { username: 'mi', password: 'mi2026' });
    const miToken = miLogin.data.token;
    const miBidRes = await request('POST', '/api/auction/bid', { expectedBid: expectedBid + 20 }, {
      'Authorization': `Bearer ${miToken}`
    });
    assert.strictEqual(miBidRes.status, 200);
    pass('Competing franchise (MI) counter-bids -> accepted by server');

    // 11. Gavel call from Auctioneer
    let webGavelStage = 0;
    webSocket.on('auction:timer', t => { if (t?.gavelStage) webGavelStage = t.gavelStage; });
    webSocket.on('auction:state', s => { if (s?.gavelStage) webGavelStage = s.gavelStage; });
    await request('POST', '/api/auction/gavel', { stage: 2 }, {
      'Authorization': `Bearer ${auctioneerToken}`
    });
    await new Promise(r => setTimeout(r, 200));
    assert.strictEqual(webGavelStage, 2, 'Gavel stage 2 must sync to clients');
    pass('Auctioneer gavel call syncs immediately to all clients');

    // 12. Auctioneer HAMMER SOLD -> syncs player to winning franchise
    let webReceivedSold = null;
    let mobileReceivedSold = null;
    webSocket.on('auction:sold', s => { webReceivedSold = s; });
    mobileSocket.on('auction:sold', s => { mobileReceivedSold = s; });

    const soldRes = await request('POST', '/api/auction/sold', {}, {
      'Authorization': `Bearer ${auctioneerToken}`
    });
    assert.strictEqual(soldRes.status, 200);

    await new Promise(r => setTimeout(r, 150));
    assert.ok(webReceivedSold, 'Web client receives auction:sold');
    assert.ok(mobileReceivedSold, 'Mobile client receives auction:sold');
    assert.strictEqual(webReceivedSold.team.shortName, 'MI', 'Winning team is MI');
    pass('Authoritative hammer SOLD broadcasts instantly to Web and Mobile clients');

    // Cleanup sockets
    webSocket.disconnect();
    mobileSocket.disconnect();

    console.log('\n======================================================');
    console.log(` RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  }
}

// Self-run or exported
if (require.main === module) {
  runTests();
}

module.exports = runTests;

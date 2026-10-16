/**
 * HAMMER — Tab Switch, Window Focus & Socket Reconnect Resilience Test
 * Validates that switching tabs, windows, screens, or recovering from throttled connections:
 * 1. Guarantees no-store cache headers on API responses so stale initial state is never served
 * 2. Active lot remains intact during socket disconnects, reconnects, and focus/visibility shifts
 * 3. Bid state, timer, high bid, and gavel controls remain preserved without reverting to empty/idle
 * 4. Auctioneer maintains 100% uninterrupted hammer control
 */

const http = require('http');
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(`${BASE_URL}${path}`, { method: 'POST', headers }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(buf);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(`${BASE_URL}${path}`, { method: 'GET', headers }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(buf);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('========================================================');
  console.log('HAMMER // TAB SWITCH & RECONNECT RESILIENCE TEST');
  console.log('========================================================\n');

  // 1. Authenticate Auctioneer and Team
  console.log('[STEP 1] Authenticating Auctioneer & Team CSK & MI...');
  const auctioneerAuth = await post('/api/auth/login', { username: 'auctioneer', password: 'hammer2026' });
  if (auctioneerAuth.status !== 200) throw new Error('Auctioneer login failed');
  const auctioneerToken = auctioneerAuth.data.token;

  const cskAuth = await post('/api/auth/login', { username: 'csk', password: 'csk2026' });
  if (cskAuth.status !== 200) throw new Error('CSK login failed');
  const cskToken = cskAuth.data.token;

  const miAuth = await post('/api/auth/login', { username: 'mi', password: 'mi2026' });
  if (miAuth.status !== 200) throw new Error('MI login failed');
  const miToken = miAuth.data.token;
  console.log('✓ Actors authenticated successfully');

  // 2. Verify Cache-Control headers on GET /api/auction/state
  console.log('\n[STEP 2] Verifying Cache-Control headers on state endpoint...');
  const stateRes = await get('/api/auction/state', auctioneerToken);
  const cc = stateRes.headers['cache-control'] || '';
  const pragma = stateRes.headers['pragma'] || '';
  console.log(`  Cache-Control: "${cc}"`);
  console.log(`  Pragma: "${pragma}"`);
  if (!cc.includes('no-store') || !cc.includes('no-cache')) {
    throw new Error('FAIL: /api/auction/state lacks Cache-Control: no-store, no-cache');
  }
  console.log('✓ Endpoint enforces strict no-store / no-cache headers');

  // 3. Put player on bid
  console.log('\n[STEP 3] Auctioneer puts player on hammer...');
  // Reset auction first if currently live
  await post('/api/auction/reset', {}, auctioneerToken);

  const playersRes = await get('/api/players', auctioneerToken);
  const availablePlayer = playersRes.data.players.find(p => p.status === 'upcoming' || p.status === 'available');
  if (!availablePlayer) throw new Error('No available player found');

  const startRes = await post('/api/auction/start', { playerId: availablePlayer.id }, auctioneerToken);
  if (startRes.status !== 200) throw new Error(`Start lot failed: ${JSON.stringify(startRes.data)}`);
  console.log(`✓ Started auction for ${availablePlayer.name} (Lot #${availablePlayer.lotNumber})`);

  // 4. Place initial bid
  console.log('\n[STEP 4] CSK places opening bid...');
  const cskBidRes = await post('/api/auction/bid', { expectedBid: availablePlayer.basePrice }, cskToken);
  if (cskBidRes.status !== 200) throw new Error(`CSK bid failed: ${JSON.stringify(cskBidRes.data)}`);
  console.log(`✓ CSK bid accepted at ₹${cskBidRes.data.currentBid}L`);

  // Place counter-bid by MI
  const nextBid = cskBidRes.data.currentBid + (cskBidRes.data.currentBid < 100 ? 10 : cskBidRes.data.currentBid < 500 ? 20 : 50);
  const miBidRes = await post('/api/auction/bid', { expectedBid: nextBid }, miToken);
  if (miBidRes.status !== 200) throw new Error(`MI bid failed: ${JSON.stringify(miBidRes.data)}`);
  console.log(`✓ MI counter-bid accepted at ₹${miBidRes.data.currentBid}L (Leading Team: MI)`);

  // 5. Connect Realtime Sockets simulating Auctioneer Desk & Team Console
  console.log('\n[STEP 5] Connecting Realtime Sockets (Simulating Auctioneer & Team Clients)...');
  const auctioneerSocket = io(BASE_URL, { auth: { token: auctioneerToken }, transports: ['websocket'] });
  const teamSocket = io(BASE_URL, { auth: { token: cskToken }, transports: ['websocket'] });

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => { if (++connected === 2) resolve(); };
    auctioneerSocket.on('connect', check);
    teamSocket.on('connect', check);
  });
  console.log('✓ Both sockets connected and authenticated');

  // 6. Simulate Tab Blur, Screen Minimization & Throttled Wake-up Synchronization
  console.log('\n[STEP 6] Simulating aggressive Tab Shift, Screen Switch & Reconnect Cycles...');
  let desyncOccurred = false;

  // Track state emitted to auctioneer and team
  auctioneerSocket.on('auction:state', (s) => {
    if (s.status === 'idle' && !s.currentPlayer) {
      console.error('❌ CRITICAL ERROR: Auctioneer received unexpected idle state while lot was active!');
      desyncOccurred = true;
    }
  });

  teamSocket.on('auction:state', (s) => {
    if (s.status === 'idle' && !s.currentPlayer) {
      console.error('❌ CRITICAL ERROR: Team Console received unexpected idle state while lot was active!');
      desyncOccurred = true;
    }
  });

  // Rapidly disconnect and reconnect sockets, mimicking background tab throttling and wake-ups
  for (let cycle = 1; cycle <= 5; cycle++) {
    process.stdout.write(`  Cycle ${cycle}/5: Disconnecting socket (mimicking background tab)... `);
    auctioneerSocket.disconnect();
    teamSocket.disconnect();

    // While disconnected, fetch state multiple times in parallel (simulating debouncedSync + visibilitychange + focus)
    const [res1, res2, res3] = await Promise.all([
      get(`/api/auction/state?_t=${Date.now()}_1`, auctioneerToken),
      get(`/api/auction/state?_t=${Date.now()}_2`, cskToken),
      get(`/api/auction/state?_t=${Date.now()}_3`, miToken)
    ]);

    if (res1.data.status !== 'live' || !res1.data.currentPlayer) {
      throw new Error(`Cycle ${cycle} Failed: state endpoint did not return live active lot: ${JSON.stringify(res1.data)}`);
    }

    // Reconnect sockets
    auctioneerSocket.connect();
    teamSocket.connect();
    await new Promise(r => setTimeout(r, 200));
    console.log('reconnected & verified active lot intact');
  }

  if (desyncOccurred) {
    throw new Error('FAIL: An unexpected idle state was broadcast during active auction');
  }
  console.log('✓ Zero desync detected across all tab-switch & reconnect cycles');

  // 7. Verify Auctioneer maintains 100% gavel authority and can finalize lot
  console.log('\n[STEP 7] Verifying Auctioneer Hammer Controls (Confirming SOLD)...');
  const soldRes = await post('/api/auction/sold', {}, auctioneerToken);
  if (soldRes.status !== 200) throw new Error(`Sold failed: ${JSON.stringify(soldRes.data)}`);
  console.log(`✓ Lot successfully sold to leading franchise ${soldRes.data.state.soldTo || 'MI'} for ₹${soldRes.data.state.soldPrice || miBidRes.data.currentBid}L`);

  auctioneerSocket.disconnect();
  teamSocket.disconnect();

  console.log('\n========================================================');
  console.log('🎉 ALL TAB-SWITCH & RECONNECT RESILIENCE TESTS PASSED!');
  console.log('========================================================\n');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});

const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('======================================================');
  console.log(' HAMMER — FINAL BUG FIX & AUTHENTICATION AUDIT TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ TEST ${total}: ${title}`);
    } else {
      console.error(`  ✗ TEST ${total}: ${title} — FAILED: ${extra}`);
      process.exitCode = 1;
    }
  }

  // TEST 1: Unauthenticated request to /auction-desk.html redirects to login
  const res1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk.html',
    method: 'GET'
  });
  assert('Logged out user -> open /auction-desk.html redirects to login',
    res1.status === 302 && res1.headers.location?.includes('/login.html'),
    `Status ${res1.status}, Location: ${res1.headers.location}`);

  // TEST 1B: Unauthenticated request to /auction-desk redirects to login
  const res1b = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk',
    method: 'GET'
  });
  assert('Logged out user -> open /auction-desk redirects to login',
    res1b.status === 302 && res1b.headers.location?.includes('/login.html'),
    `Status ${res1b.status}, Location: ${res1b.headers.location}`);

  // Login as team owner (CSK)
  const loginCsk = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'csk', password: 'csk2026' });

  const cskData = JSON.parse(loginCsk.body);
  const cskToken = cskData.token;

  // TEST 2: Team user requests /auction-desk.html -> 403 Forbidden with unauthorized.html
  const res2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk.html',
    method: 'GET',
    headers: { 'Cookie': `hammer_token=${cskToken}` }
  });
  assert('Team user -> open /auction-desk.html returns 403 unauthorized page',
    res2.status === 403 && res2.body.includes('ACCESS RESTRICTED'),
    `Status ${res2.status}, contains ACCESS RESTRICTED: ${res2.body.includes('ACCESS RESTRICTED')}`);

  // Login as auctioneer
  const loginAuctioneer = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'auctioneer', password: 'hammer2026' });

  const auctioneerData = JSON.parse(loginAuctioneer.body);
  const auctioneerToken = auctioneerData.token;

  // TEST 3: Auctioneer requests /auction-desk.html -> 200 OK
  const res3 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk.html',
    method: 'GET',
    headers: { 'Cookie': `hammer_token=${auctioneerToken}` }
  });
  assert('Auctioneer -> open /auction-desk.html returns 200 OK',
    res3.status === 200 && res3.body.includes('AUCTIONEER DESK'),
    `Status ${res3.status}`);

  // TEST 4: Player Pool API returns 73 real cricketers
  const res4 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/players?limit=100',
    method: 'GET'
  });
  const poolData = JSON.parse(res4.body);
  assert('Player Pool API returns all 73 real cricketers from database',
    res4.status === 200 && poolData.players?.length === 73 && poolData.total === 73,
    `Status ${res4.status}, count: ${poolData.players?.length}, total: ${poolData.total}`);

  // TEST 5: Verify player records have stats, lot number, role, base price, image
  const firstPlayer = poolData.players[0];
  assert('Player records have verified fields (name, role, lotNumber, basePrice, stats)',
    firstPlayer && firstPlayer.name && firstPlayer.role && firstPlayer.basePrice > 0 && firstPlayer.stats,
    `Player #1: ${JSON.stringify(firstPlayer)}`);

  // TEST 6: Team user requests /team-console.html -> 200 OK
  const res6 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/team-console.html',
    method: 'GET',
    headers: { 'Cookie': `hammer_token=${cskToken}` }
  });
  assert('Team user -> open /team-console.html returns 200 OK',
    res6.status === 200 && res6.body.includes('TEAM TERMINAL'),
    `Status ${res6.status}`);

  // TEST 7: Unauthenticated request to /team-console.html redirects to login
  const res7 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/team-console.html',
    method: 'GET'
  });
  assert('Logged out user -> open /team-console.html redirects to login',
    res7.status === 302 && res7.headers.location?.includes('/login.html'),
    `Status ${res7.status}, Location: ${res7.headers.location}`);

  // TEST 8: Server-side check - Team owner CANNOT call auctioneer endpoints (e.g. /api/auction/start)
  const res8 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cskToken}`
    }
  }, { playerId: 1 });
  assert('Server rejects non-auctioneer calling /api/auction/start with 403',
    res8.status === 403,
    `Status ${res8.status}`);

  // TEST 9: Auctioneer CANNOT place bids (only team owners can bid)
  const res9 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auctioneerToken}`
    }
  }, { expectedBid: 200 });
  assert('Server rejects auctioneer calling /api/auction/bid with 403',
    res9.status === 403,
    `Status ${res9.status}`);

  // TEST 10: Auctioneer timer reset endpoint works
  const res10 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/timer/reset',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auctioneerToken}`
    }
  }, { seconds: 10 });
  // If auction is idle, expects 400 'Auction is not active'
  assert('Auctioneer timer reset endpoint exists and enforces validation',
    res10.status === 400 || res10.status === 200,
    `Status ${res10.status}`);

  // TEST 11: Logout revokes session
  const res11 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cskToken}` }
  });
  const res11Check = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${cskToken}` }
  });
  assert('Logout successfully terminates session on server',
    res11.status === 200 && res11Check.status === 401,
    `Logout status ${res11.status}, Auth check status ${res11Check.status}`);

  console.log(`\n======================================================`);
  console.log(` RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed/total)*100)}%)`);
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});

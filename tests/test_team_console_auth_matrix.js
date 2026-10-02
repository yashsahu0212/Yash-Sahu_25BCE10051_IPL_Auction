const http = require('http');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
        cookies: res.headers['set-cookie'] || []
      }));
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(cookieHeaders, name) {
  for (const c of cookieHeaders) {
    const parts = c.split(';');
    for (const part of parts) {
      const [k, v] = part.trim().split('=');
      if (k === name) return v;
    }
  }
  return null;
}

async function runMatrix() {
  console.log('================================================================');
  console.log(' HAMMER — COMPREHENSIVE AUTHENTICATION & TEAM CONSOLE MATRIX');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title, condition, extra = '') {
    total++;
    if (condition) {
      passed++;
      console.log('  [PASS] TEST ' + total + ': ' + title);
    } else {
      console.error('  [FAIL] TEST ' + total + ': ' + title + ' — ' + extra);
      process.exitCode = 1;
    }
  }

  // SCENARIO M: Open Team Console while unauthenticated (Fresh browser)
  const resM = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/team-console.html',
    method: 'GET'
  });
  assert('Fresh unauthenticated browser opens /team-console.html -> 302 redirects to login',
    resM.status === 302 && resM.headers.location && resM.headers.location.includes('/login.html?redirect=/team-console.html'),
    'Status ' + resM.status + ', Location: ' + resM.headers.location);

  // SCENARIO D: Team A (CSK) Login
  const loginCsk = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'csk', password: 'csk2026' });

  const cskData = JSON.parse(loginCsk.body);
  const cskToken = cskData.token;
  const cskCookie = extractCookie(loginCsk.cookies, 'hammer_token');

  assert('Team A (CSK) authenticates -> receives signed token and Set-Cookie',
    loginCsk.status === 200 && cskToken && cskData.user.role === 'team_owner' && cskData.user.teamId === 'CSK',
    'Status: ' + loginCsk.status + ', Role: ' + cskData.user && cskData.user.role);

  // SCENARIO G: Open Team Console directly with cookie
  const resG = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/team-console.html',
    method: 'GET',
    headers: { 'Cookie': 'hammer_token=' + cskToken }
  });
  assert('Open Team Console directly with authenticated session -> 200 OK (no black screen redirect)',
    resG.status === 200 && !resG.body.includes('style="opacity: 0"'),
    'Status ' + resG.status);

  // SCENARIO B/C: Normal & Hard Refresh Team Console (Session validation via /api/auth/me)
  const resMeCsk = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + cskToken, 'Cookie': 'hammer_token=' + cskToken }
  });
  const meCskData = JSON.parse(resMeCsk.body);
  assert('Refresh Team Console -> /api/auth/me restores session accurately',
    resMeCsk.status === 200 && meCskData.user && meCskData.user.teamId === 'CSK',
    'Status ' + resMeCsk.status);

  // SCENARIO N: Team user opens Auction Desk -> 403 Forbidden
  const resN = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk.html',
    method: 'GET',
    headers: { 'Cookie': 'hammer_token=' + cskToken }
  });
  assert('Team user attempts to access /auction-desk.html -> 403 Access Restricted',
    resN.status === 403 && resN.body.includes('ACCESS RESTRICTED'),
    'Status ' + resN.status);

  // SCENARIO: Auctioneer Login
  const loginAuct = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'auctioneer', password: 'hammer2026' });
  const auctData = JSON.parse(loginAuct.body);
  const auctToken = auctData.token;

  assert('Auctioneer authenticates -> receives signed token and auctioneer role',
    loginAuct.status === 200 && auctToken && auctData.user.role === 'auctioneer',
    'Role: ' + auctData.user && auctData.user.role);

  // SCENARIO O: Auctioneer opens Team Console -> 403 Forbidden
  const resO = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/team-console.html',
    method: 'GET',
    headers: { 'Cookie': 'hammer_token=' + auctToken }
  });
  assert('Auctioneer opens /team-console.html -> 403 Access Restricted (stops infinite redirect loop)',
    resO.status === 403 && resO.body.includes('ACCESS RESTRICTED'),
    'Status ' + resO.status);

  // SCENARIO: Auctioneer opens Auction Desk directly
  const resAuctDesk = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/auction-desk.html',
    method: 'GET',
    headers: { 'Cookie': 'hammer_token=' + auctToken }
  });
  assert('Auctioneer opens /auction-desk.html directly -> 200 OK (no opacity:0)',
    resAuctDesk.status === 200 && !resAuctDesk.body.includes('style="opacity: 0"'),
    'Status ' + resAuctDesk.status);

  // Reset auction state before lot test
  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/reset-all',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + auctToken, 'Cookie': 'hammer_token=' + auctToken }
  });

  // SCENARIO: Auctioneer starts player lot (Put On Bid)
  const startLot = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/start',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auctToken }
  }, { playerId: 1 });
  const startLotData = JSON.parse(startLot.body);

  assert('Auctioneer puts player on bid on first request -> 200 OK live lot',
    startLot.status === 200 && startLotData.state && startLotData.state.status === 'live' && startLotData.state.currentPlayer && startLotData.state.currentPlayer.id === 1,
    'Status: ' + startLot.status);

  // SCENARIO 4: Team A (CSK) places bid -> succeeds
  const bid1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cskToken }
  }, { expectedBid: 200 });
  const bid1Data = JSON.parse(bid1.body);

  assert('Team A (CSK) places bid -> accepted with 200 OK without Authentication Required',
    bid1.status === 200 && bid1Data.state && bid1Data.state.leadingTeamId === 'CSK' && bid1Data.acceptedBid === 200,
    'Status: ' + bid1.status);

  // SCENARIO 6: Team A cannot bid against itself
  const bidSelf = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cskToken }
  }, { expectedBid: 220 });
  assert('Leading team cannot bid against itself -> rejected by server with 400',
    bidSelf.status === 400 && JSON.parse(bidSelf.body).error && JSON.parse(bidSelf.body).error.includes('cannot outbid itself') || JSON.parse(bidSelf.body).code === 'ALREADY_LEADING',
    'Status: ' + bidSelf.status);

  // SCENARIO 5: Team B (MI) places counter-bid
  const loginMi = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'mi', password: 'mi2026' });
  const miToken = JSON.parse(loginMi.body).token;

  const bid2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/bid',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + miToken }
  }, { expectedBid: 220 });
  const bid2Data = JSON.parse(bid2.body);

  assert('Team B (MI) places counter-bid -> accepted and updates leading team to MI',
    bid2.status === 200 && bid2Data.state && bid2Data.state.leadingTeamId === 'MI' && bid2Data.acceptedBid === 220,
    'Status: ' + bid2.status);

  // SCENARIO 15: Auctioneer HAMMER SOLD -> player acquired by MI
  const soldRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auction/sold',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + auctToken }
  });
  const soldData = JSON.parse(soldRes.body);

  assert('Auctioneer HAMMER SOLD -> player awarded to leading franchise (MI)',
    soldRes.status === 200 && soldData.team && soldData.team.id === 'MI' && soldData.price === 220,
    'Status: ' + soldRes.status);

  // SCENARIO L: Expired/invalid session
  const resBadToken = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': 'Bearer hm.badpayload.badsig' }
  });
  assert('Invalid/tampered session token -> 401 Not authenticated',
    resBadToken.status === 401,
    'Status: ' + resBadToken.status);

  // SCENARIO E: Logout
  const resLogout = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/logout',
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + cskToken }
  });
  assert('Logout terminates session -> cleared cookie and invalidated server token',
    resLogout.status === 200 && resLogout.cookies.some(function(c) { return c.includes('hammer_token=;') || c.includes('expires='); }),
    'Status: ' + resLogout.status);

  // SCENARIO: Post-logout request with invalidated token receives 401
  const resPostLogout = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + cskToken }
  });
  assert('Post-logout token lookup receives 401 Not authenticated',
    resPostLogout.status === 401,
    'Status: ' + resPostLogout.status);

  console.log('\n================================================================');
  console.log(' RESULTS: ' + passed + '/' + total + ' TESTS PASSED (' + Math.round((passed/total)*100) + '%)');
  console.log('================================================================');
}

runMatrix().catch(console.error);
